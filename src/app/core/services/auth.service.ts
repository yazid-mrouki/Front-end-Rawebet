import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, AuthResponse, RegisterRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  public authState = new BehaviorSubject<boolean>(this.isAuthenticated());

  constructor(private http: HttpClient, private router: Router) {}

  login(body: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, body).pipe(
      tap(res => {
        localStorage.setItem('token', res.accessToken);
        this.authState.next(true);
      })
    );
  }

  register(body: RegisterRequest) {
    return this.http.post<void>(`${this.api}/users/add`, body);
  }

  logout() {
    this.http.post(`${this.api}/auth/logout`, {}).subscribe();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.authState.next(false);
    this.router.navigate(['/auth/sign-in']);
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean { return !!this.getToken(); }

  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.roles || payload.authorities || [];
    } catch {
      return [];
    }
  }

  isAdmin(): boolean {
    const roles = this.getRoles();
    console.log('roles from token:', roles);
    return roles.some(r =>
      ['SUPER_ADMIN','ADMIN_CINEMA','ADMIN_EVENT','ADMIN_FORMATION'].includes(r)
    );
  }

  isSuperAdmin(): boolean { return this.getRoles().includes('SUPER_ADMIN'); }

  forgotPassword(email: string) {
    return this.http.post(`${this.api}/auth/forgot-password?email=${email}`, {});
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${this.api}/auth/reset-password?token=${token}&newPassword=${newPassword}`, {});
  }
}
