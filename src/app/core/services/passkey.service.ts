import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';
import {
  PasskeyFinishAuthenticationRequest,
  PasskeyFinishRegistrationRequest,
  PasskeyStartAuthenticationResponse,
  PasskeyStartRegistrationResponse,
  SerializedPublicKeyCredential,
  WebAuthnCreationOptions,
  WebAuthnRequestOptions,
} from '../models/passkey.model';

@Injectable({ providedIn: 'root' })
export class PasskeyService {
  private readonly api = environment.apiUrl.replace(/\/$/, '');
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  isSupported(): boolean {
    return this.isBrowser() && typeof window !== 'undefined' && 'PublicKeyCredential' in window;
  }

  async signInWithPasskey(
    username?: string,
    mode: 'platform' | 'passkey' = 'passkey',
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Les passkeys ne sont pas prises en charge par ce navigateur.');
    }

    await this.ensurePlatformAuthenticatorAvailable();

    const startResponse = await firstValueFrom(
      this.http.post<PasskeyStartAuthenticationResponse>(
        `${this.api}/auth/webauthn/authentication/start`,
        { username: username?.trim() || undefined },
      ),
    );

    const requestOptions = this.toRequestOptions(startResponse.publicKeyCredentialRequestOptions, mode);

    const credential = await this.withTimeout(
      navigator.credentials.get({
        publicKey: requestOptions,
      }) as Promise<PublicKeyCredential | null>,
      65000,
      'Le prompt Windows Hello ne repond pas. Verifiez PIN/Face dans Windows, puis reessayez.',
    );

    if (!credential) {
      throw new Error('Authentification annulée.');
    }

    const finishPayload: PasskeyFinishAuthenticationRequest = {
      requestId: startResponse.requestId,
      credential: this.serializeCredential(credential),
    };

    const authResponse = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${this.api}/auth/webauthn/authentication/finish`,
        finishPayload,
      ),
    );

    this.auth.completeAuthSession(authResponse);
  }

  async registerPasskey(
    details: { username: string; displayName: string },
    mode: 'platform' | 'passkey' = 'passkey',
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Les passkeys ne sont pas prises en charge par ce navigateur.');
    }

    await this.ensurePlatformAuthenticatorAvailable();

    const startResponse = await firstValueFrom(
      this.http.post<PasskeyStartRegistrationResponse>(
        `${this.api}/auth/webauthn/registration/start`,
        {
          username: details.username.trim(),
          displayName: details.displayName.trim(),
        },
      ),
    );

    console.log('[Passkey] Registration started:', startResponse);

    const creationOptions = this.toCreationOptions(startResponse.publicKeyCredentialCreationOptions, mode);
    console.log('[Passkey] Calling navigator.credentials.create with options:', creationOptions);

    let credential: PublicKeyCredential | null;
    try {
      credential = await this.withTimeout(
        navigator.credentials.create({
          publicKey: creationOptions,
        }) as Promise<PublicKeyCredential | null>,
        90000,
        'Le prompt Windows Hello ne repond pas. Verifiez PIN/Face dans Windows, puis reessayez.',
      );
    } catch (error) {
      const message = String((error as { message?: unknown })?.message || '');
      if (message.toLowerCase().includes('already registered')) {
        throw new Error('Cette cle est deja enregistree pour ce compte. Le blocage vient du navigateur (avant registration/finish). Utilisez la connexion Face ID/Passkey, ou supprimez la cle existante puis reenrollez.');
      }
      throw error;
    }

    console.log('[Passkey] Credential created:', credential);

    if (!credential) {
      throw new Error('Enregistrement annulé.');
    }

    const finishPayload: PasskeyFinishRegistrationRequest = {
      requestId: startResponse.requestId,
      credential: this.serializeCredential(credential),
    };

    console.log('[Passkey] Sending finish payload:', finishPayload);

    await firstValueFrom(
      this.http.post<void>(
        `${this.api}/auth/webauthn/registration/finish`,
        finishPayload,
      ),
    );

    console.log('[Passkey] Registration completed successfully');
  }

  private toCreationOptions(
    options: WebAuthnCreationOptions,
    mode: 'platform' | 'passkey' = 'passkey',
  ): PublicKeyCredentialCreationOptions {
    const sanitizedExtensions = this.sanitizeExtensions(options.extensions);
    const selection = this.buildAuthenticatorSelection(options.authenticatorSelection, mode);
    const hints = this.buildRegistrationHints(mode, options.hints);

    const normalized = {
      ...options,
      challenge: this.base64UrlToArrayBuffer(options.challenge),
      user: {
        ...options.user,
        id: this.base64UrlToArrayBuffer(options.user.id),
      },
      excludeCredentials: options.excludeCredentials?.map((credential) => ({
        ...credential,
        id: this.base64UrlToArrayBuffer(credential.id),
      })),
      hints,
      authenticatorSelection: selection,
      extensions: sanitizedExtensions,
    };

    return this.pruneNullish(normalized) as PublicKeyCredentialCreationOptions;
  }

  private buildAuthenticatorSelection(
    baseSelection: Record<string, unknown> | undefined,
    mode: 'platform' | 'passkey',
  ): Record<string, unknown> | undefined {
    const selection = {
      ...(baseSelection || {}),
    } as Record<string, unknown>;

    if (mode === 'platform') {
      // Force local authenticator (Windows Hello / Face / Fingerprint) when user chooses Face ID.
      selection['authenticatorAttachment'] = 'platform';
      selection['userVerification'] = 'required';
      selection['residentKey'] = 'required';
      selection['requireResidentKey'] = true;
      return selection;
    }

    // Passkey mode: let browser choose the best authenticator flow (phone/cloud/security key/local).
    delete selection['authenticatorAttachment'];
    return Object.keys(selection).length ? selection : undefined;
  }

  private buildRegistrationHints(
    mode: 'platform' | 'passkey',
    existingHints?: string[],
  ): string[] | undefined {
    if (mode === 'platform') {
      // Prefer local device UX (Windows Hello) when available.
      return ['client-device'];
    }

    const merged = [...(existingHints || []), 'hybrid', 'security-key'];
    const unique = Array.from(new Set(merged.filter((hint) => !!hint)));
    return unique.length ? unique : undefined;
  }

  private toRequestOptions(
    options: WebAuthnRequestOptions,
    mode: 'platform' | 'passkey' = 'passkey',
  ): PublicKeyCredentialRequestOptions {
    const sanitizedExtensions = this.sanitizeExtensions(options.extensions);
    const hints = this.buildAuthenticationHints(mode, options.hints);

    const normalized = {
      ...options,
      challenge: this.base64UrlToArrayBuffer(options.challenge),
      allowCredentials: options.allowCredentials?.map((credential) => ({
        ...credential,
        id: this.base64UrlToArrayBuffer(credential.id),
      })),
      hints,
      extensions: sanitizedExtensions,
    };

    return this.pruneNullish(normalized) as PublicKeyCredentialRequestOptions;
  }

  private buildAuthenticationHints(
    mode: 'platform' | 'passkey',
    existingHints?: string[],
  ): string[] | undefined {
    if (mode === 'platform') {
      // Prefer local authenticator UX (Windows Hello) when available.
      return ['client-device'];
    }

    // Prefer synced/cross-device passkey UX.
    const merged = [...(existingHints || []), 'hybrid', 'security-key'];
    const unique = Array.from(new Set(merged.filter((hint) => !!hint)));
    return unique.length ? unique : undefined;
  }

  private sanitizeExtensions(extensions: unknown): AuthenticationExtensionsClientInputs | undefined {
    if (!extensions || typeof extensions !== 'object') {
      return undefined;
    }

    const entries = Object.entries(extensions as Record<string, unknown>)
      .filter(([, value]) => value !== null && value !== undefined);

    if (!entries.length) {
      return undefined;
    }

    return Object.fromEntries(entries) as AuthenticationExtensionsClientInputs;
  }

  private pruneNullish<T>(value: T): T {
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.pruneNullish(item))
        .filter((item) => item !== null && item !== undefined) as T;
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (nestedValue === null || nestedValue === undefined) {
        continue;
      }

      const cleaned = this.pruneNullish(nestedValue);
      if (cleaned === null || cleaned === undefined) {
        continue;
      }

      result[key] = cleaned;
    }

    return result as T;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private serializeCredential(credential: PublicKeyCredential): SerializedPublicKeyCredential {
    const response = credential.response as
      | AuthenticatorAttestationResponse
      | AuthenticatorAssertionResponse
      | (AuthenticatorAttestationResponse & { getTransports?: () => AuthenticatorTransport[] });
    const serializedResponse: SerializedPublicKeyCredential['response'] = {
      clientDataJSON: this.arrayBufferToBase64Url(response.clientDataJSON),
    };

    if ('attestationObject' in response) {
      serializedResponse.attestationObject = this.arrayBufferToBase64Url(response.attestationObject as ArrayBuffer);
    }

    if ('authenticatorData' in response) {
      serializedResponse.authenticatorData = this.arrayBufferToBase64Url(response.authenticatorData as ArrayBuffer);
    }

    if ('signature' in response) {
      serializedResponse.signature = this.arrayBufferToBase64Url(response.signature as ArrayBuffer);
    }

    if ('userHandle' in response) {
      serializedResponse.userHandle = response.userHandle
        ? this.arrayBufferToBase64Url(response.userHandle as ArrayBuffer)
        : null;
    }

    const transportList = typeof (response as { getTransports?: () => AuthenticatorTransport[] }).getTransports === 'function'
      ? (response as { getTransports: () => AuthenticatorTransport[] }).getTransports()
      : undefined;
    if (transportList?.length) {
      serializedResponse.transports = transportList;
    }

    return {
      id: credential.id,
      rawId: this.arrayBufferToBase64Url(credential.rawId),
      type: 'public-key',
      response: serializedResponse,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    };
  }

  private base64UrlToArrayBuffer(value: string): ArrayBuffer {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
  }

  private arrayBufferToBase64Url(value: ArrayBuffer): string {
    const bytes = new Uint8Array(value);
    let binary = '';

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private async ensurePlatformAuthenticatorAvailable(): Promise<void> {
    if (!this.isBrowser() || typeof PublicKeyCredential === 'undefined') {
      return;
    }

    const checker = (PublicKeyCredential as unknown as {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    }).isUserVerifyingPlatformAuthenticatorAvailable;

    if (typeof checker !== 'function') {
      return;
    }

    const available = await checker.call(PublicKeyCredential);
    if (!available) {
      throw new Error('Windows Hello non configure. Activez au moins un PIN/Face/empreinte dans Windows puis reessayez.');
    }
  }
}
