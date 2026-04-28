export interface WebAuthnPublicKeyCredentialParameter {
  type: 'public-key';
  alg: number;
}

export interface WebAuthnPublicKeyCredentialDescriptor {
  type: 'public-key';
  id: string;
  transports?: AuthenticatorTransport[];
}

export interface WebAuthnUserEntity {
  id: string;
  name: string;
  displayName: string;
}

export interface WebAuthnCreationOptions {
  challenge: string;
  rp: {
    name: string;
    id?: string;
  };
  user: WebAuthnUserEntity;
  pubKeyCredParams: WebAuthnPublicKeyCredentialParameter[];
  timeout?: number;
  excludeCredentials?: WebAuthnPublicKeyCredentialDescriptor[];
  authenticatorSelection?: Record<string, unknown>;
  attestation?: AttestationConveyancePreference;
  extensions?: Record<string, unknown>;
  hints?: string[];
}

export interface WebAuthnRequestOptions {
  challenge: string;
  rpId?: string;
  timeout?: number;
  allowCredentials?: WebAuthnPublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: Record<string, unknown>;
  hints?: string[];
}

export interface PasskeyStartRegistrationResponse {
  requestId?: string;
  publicKeyCredentialCreationOptions: WebAuthnCreationOptions;
}

export interface PasskeyStartAuthenticationResponse {
  requestId?: string;
  publicKeyCredentialRequestOptions: WebAuthnRequestOptions;
}

export interface SerializedPublicKeyCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    attestationObject?: string;
    authenticatorData?: string;
    signature?: string;
    userHandle?: string | null;
    transports?: AuthenticatorTransport[];
  };
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  authenticatorAttachment?: string | null;
}

export interface PasskeyFinishRegistrationRequest {
  requestId?: string;
  credential: SerializedPublicKeyCredential;
}

export interface PasskeyFinishAuthenticationRequest {
  requestId?: string;
  credential: SerializedPublicKeyCredential;
}
