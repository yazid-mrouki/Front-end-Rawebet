import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ImpersonationInfo {
  targetUserId: number;
  targetUserName: string;
  targetUserEmail: string;
}

@Injectable({ providedIn: 'root' })
export class ImpersonationService {
  private readonly TOKEN_KEY = 'rawabet_impersonation_token';
  private readonly INFO_KEY = 'rawabet_impersonation_info';

  private readonly api = environment.apiUrl.replace(/\/$/, '');
  private readonly platformId = inject(PLATFORM_ID);

  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);

  // ── Guard SSR ─────────────────────────────────────────────────────────
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ── START IMPERSONATION ───────────────────────────────────────────────
  startImpersonation(info: ImpersonationInfo) {
    return this.http
      .post<{
        accessToken: string;
      }>(`${this.api}/auth/impersonate`, { targetUserId: info.targetUserId })
      .pipe(
        tap((res) => {
          if (this.isBrowser()) {
            sessionStorage.setItem(this.TOKEN_KEY, res.accessToken);
            sessionStorage.setItem(this.INFO_KEY, JSON.stringify(info));
          }
          this.auth.authState.next(true);
        }),
        catchError((err) => {
          console.error('❌ Impersonation failed:', err);
          return throwError(() => err);
        }),
      );
  }

  // ── EXIT IMPERSONATION ────────────────────────────────────────────────
  exitImpersonation() {
    if (this.isBrowser()) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.INFO_KEY);
    }
    this.auth.authState.next(true);
    this.router.navigate(['/admin/dashboard']);
  }

  // ── CHECK MODE ────────────────────────────────────────────────────────
  isImpersonating(): boolean {
    if (!this.isBrowser()) return false;
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // ── TOKEN ─────────────────────────────────────────────────────────────
  getImpersonationToken(): string | null {
    if (!this.isBrowser()) return null;
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  // ── INFOS ─────────────────────────────────────────────────────────────
  getImpersonationInfo(): ImpersonationInfo | null {
    if (!this.isBrowser()) return null;
    const raw = sessionStorage.getItem(this.INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Retourne l'ID réel de l'admin depuis le token localStorage
   * même quand on est en mode client (impersonation).
   */
  getRealAdminId(): number | null {
    if (!this.isBrowser()) return null;
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.userId ?? null;
    } catch {
      return null;
    }
  }
}
