import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { LoginRequest, AuthResponse, RegisterRequest } from '../models/auth.model';

interface DecodedToken {
  exp?: number;
  sub?: string;
  roles?: string[];
  permissions?: string[];
  userId?: number;
  name?: string;
  email?: string;
  impersonation?: boolean;
  impersonatedBy?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly tokenKey = 'token';
  private readonly guestKey = 'rawabet_guest_preview';
  private readonly impersonationKey = 'rawabet_impersonation_token';

  public authState = new BehaviorSubject<boolean>(this.hasValidToken());

  // ── Auth ──────────────────────────────────────────────────────────────
  login(body: LoginRequest) {
    this.clearStoredSession(false);
    return this.http
      .post<AuthResponse>(`${this.api}/auth/login`, body)
      .pipe(tap((res) => this.completeAuthSession(res)));
  }

  completeAuthSession(response: AuthResponse) {
    this.persistToken(response.accessToken);
    this.authState.next(true);
  }

  register(body: RegisterRequest) {
    return this.http.post<void>(`${this.api}/users/add`, body);
  }

  logout(redirectToLogin = true) {
    this.clearStoredSession(false);
    if (this.isBrowser()) sessionStorage.removeItem(this.impersonationKey);
    this.http.post(`${this.api}/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => undefined,
      error: () => undefined,
    });
    this.authState.next(false);
    if (redirectToLogin) this.router.navigate(['/auth/sign-in']);
  }

  handleUnauthorized() {
    this.clearStoredSession(false);
    this.authState.next(false);
    this.router.navigate(['/auth/sign-in']);
  }

  // ── Alerte tentative suspecte ─────────────────────────────────────────
  sendSuspectAlert(email: string, photoBase64: string, timestamp: string) {
    return this.http.post(
      `${this.api}/auth/suspect-alert`,
      {
        email,
        photoBase64,
        timestamp,
        clientIp: null,
      },
      { responseType: 'text' },
    );
  }

  // ── Token actif ───────────────────────────────────────────────────────
  /**
   * Retourne le token actif avec priorité :
   * 1. Token d'impersonation (sessionStorage) → mode client
   * 2. Token normal (localStorage) → mode admin/client standard
   *
   * Tous les appels HTTP et getRoles() / isAdmin() lisent TOUJOURS ce token.
   * → En mode client : isAdmin() = false, adminGuard bloque /admin/*
   */
  getToken(): string | null {
    if (!this.isBrowser()) return null;
    if (this.isGuestMode()) return null;
    return this.getActiveToken();
  }

  private getActiveToken(): string | null {
    if (!this.isBrowser()) return null;

    // Priorité 1 — token d'impersonation (mode client)
    const impToken = sessionStorage.getItem(this.impersonationKey);
    if (impToken && !this.isTokenExpired(impToken)) return impToken;

    // Priorité 2 — token normal
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return null;
    if (this.isTokenExpired(token)) {
      this.clearStoredSession(false);
      this.authState.next(false);
      return null;
    }
    return token;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ── Modes spéciaux ────────────────────────────────────────────────────
  isGuestMode(): boolean {
    if (!this.isBrowser()) return false;
    return sessionStorage.getItem(this.guestKey) === 'true';
  }

  isImpersonating(): boolean {
    if (!this.isBrowser()) return false;
    const t = sessionStorage.getItem(this.impersonationKey);
    return !!t && !this.isTokenExpired(t);
  }

  // ── Roles / Permissions ───────────────────────────────────────────────
  getRoles(): string[] {
    return this.getDecodedToken()?.roles || [];
  }

  getPermissions(): string[] {
    return this.getDecodedToken()?.permissions || [];
  }

  getCurrentUserId(): number | null {
    const id = this.getDecodedToken()?.userId;
    return typeof id === 'number' ? id : null;
  }

  getCurrentUserName(): string {
    const d = this.getDecodedToken();
    if (d?.name) return d.name;
    const s = d?.sub || d?.email || '';
    return s.includes('@') ? s.split('@')[0] : s;
  }

  getCurrentUserEmail(): string {
    const d = this.getDecodedToken();
    return d?.email || d?.sub || '';
  }

  hasPermission(p: string): boolean {
    return this.isSuperAdmin() || this.getPermissions().includes(p);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  /**
   * isAdmin() lit le token ACTIF.
   * En mode impersonation, le token actif est le token CLIENT → isAdmin() = false.
   * C'est ce comportement voulu qui isole complètement le mode client.
   */
  isAdmin(): boolean {
    return this.getRoles().some((r) =>
      ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'].includes(r),
    );
  }

  isSuperAdmin(): boolean {
    return this.getRoles().includes('SUPER_ADMIN');
  }

  // ── Password reset ────────────────────────────────────────────────────
  forgotPassword(email: string) {
    return this.http.post(
      `${this.api}/auth/forgot-password?email=${encodeURIComponent(email.trim())}`,
      {},
      { withCredentials: true, responseType: 'text' },
    );
  }

  resetPasswordWithSession(newPassword: string) {
    return this.http.post(
      `${this.api}/auth/reset-password/session`,
      { newPassword },
      { withCredentials: true, responseType: 'text' },
    );
  }

  resetPasswordWithOtp(email: string, code: string, newPassword: string) {
    return this.http.post(
      `${this.api}/auth/reset-password/otp`,
      { email: email.trim(), code: code.trim(), newPassword },
      { responseType: 'text' },
    );
  }

  // ── Privé ─────────────────────────────────────────────────────────────
  private getDecodedToken(): DecodedToken | null {
    if (!this.isBrowser() || this.isGuestMode()) return null;
    const token = this.getActiveToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      this.clearStoredSession(false);
      return null;
    }
  }

  private hasValidToken(): boolean {
    if (!this.isBrowser()) return false;
    return !!this.getActiveToken();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      if (!p?.exp) return false;
      return p.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  private persistToken(token: string) {
    if (this.isBrowser()) localStorage.setItem(this.tokenKey, token);
  }

  private clearStoredSession(updateState = true) {
    if (this.isBrowser()) localStorage.removeItem(this.tokenKey);
    if (updateState) this.authState.next(false);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
