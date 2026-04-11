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
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly tokenKey = 'token';

  public authState = new BehaviorSubject<boolean>(this.hasValidToken());

  login(body: LoginRequest) {
    this.clearStoredSession(false);
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, body).pipe(
      tap((res) => {
        this.persistToken(res.accessToken);
        this.authState.next(true);
      }),
    );
  }

  register(body: RegisterRequest) {
    return this.http.post<void>(`${this.api}/users/add`, body);
  }

  logout(redirectToLogin = true) {
    this.clearStoredSession(false);
    this.http.post(`${this.api}/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => undefined,
      error: () => undefined,
    });
    this.authState.next(false);
    if (redirectToLogin) {
      this.router.navigate(['/auth/sign-in']);
    }
  }

  handleUnauthorized() {
    this.clearStoredSession(false);
    this.authState.next(false);
    this.router.navigate(['/auth/sign-in']);
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;

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

  getRoles(): string[] {
    return this.getDecodedToken()?.roles || [];
  }

  getPermissions(): string[] {
    return this.getDecodedToken()?.permissions || [];
  }

  getCurrentUserId(): number | null {
    const userId = this.getDecodedToken()?.userId;
    return typeof userId === 'number' ? userId : null;
  }

  getCurrentUserName(): string {
    const decoded = this.getDecodedToken();
    if (decoded?.name) {
      return decoded.name;
    }

    const subject = decoded?.sub || decoded?.email || '';
    return subject.includes('@') ? subject.split('@')[0] : subject;
  }

  getCurrentUserEmail(): string {
    const decoded = this.getDecodedToken();
    return decoded?.email || decoded?.sub || '';
  }

  hasPermission(permission: string): boolean {
    return this.isSuperAdmin() || this.getPermissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  isAdmin(): boolean {
    const roles = this.getRoles();
    return roles.some((role) => ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_FORMATION'].includes(role));
  }

  isSuperAdmin(): boolean {
    return this.getRoles().includes('SUPER_ADMIN');
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.api}/auth/forgot-password?email=${email}`, {}, { withCredentials: true });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${this.api}/auth/reset-password?token=${token}&newPassword=${newPassword}`, {}, { withCredentials: true });
  }

  private getDecodedToken(): DecodedToken | null {
    const token = this.peekStoredToken();
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      this.clearStoredSession(false);
      return null;
    }
  }

  private hasValidToken(): boolean {
    const token = this.peekStoredToken();
    return !!token && !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload?.exp) return false;
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  private persistToken(token: string) {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.tokenKey, token);
  }

  private peekStoredToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.tokenKey);
  }

  private clearStoredSession(updateState = true) {
    if (this.isBrowser()) {
      localStorage.removeItem(this.tokenKey);
    }
    if (updateState) {
      this.authState.next(false);
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
