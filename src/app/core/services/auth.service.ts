import { Injectable } from '@angular/core';

export type UserRole = 'admin' | 'member' | 'guest';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _role: UserRole = 'admin'; // Default to admin for demo purposes
  private _isAuthenticated = true;

  get role(): UserRole {
    return this._role;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get isAdmin(): boolean {
    return this._role === 'admin';
  }

  /** Toggle role between admin and member (for demo/testing) */
  toggleRole(): void {
    this._role = this._role === 'admin' ? 'member' : 'admin';
  }

  setRole(role: UserRole): void {
    this._role = role;
  }

  login(role: UserRole = 'member'): void {
    this._isAuthenticated = true;
    this._role = role;
  }

  logout(): void {
    this._isAuthenticated = false;
    this._role = 'guest';
  }
}
