import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  UserResponse,
  UserSummaryResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RegisterRequest,
  AdminUpdateUserRequest,
  BanRequest,
  Page,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Profil connecté ──────────────────────────────────────────────────
  getMe() {
    return this.http.get<UserResponse>(`${this.api}/users/me`);
  }

  updateMe(body: UpdateProfileRequest) {
    return this.http.put<UserResponse>(`${this.api}/users/me/update`, body);
  }

  uploadMyAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserResponse>(`${this.api}/users/me/avatar`, formData);
  }

  changePassword(body: ChangePasswordRequest) {
    return this.http.put(`${this.api}/users/me/password`, body, { responseType: 'text' });
  }

  // ── Admin — liste paginée ────────────────────────────────────────────
  getAllUsers(page = 0, size = 20, sort = 'createdAt', direction = 'desc') {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<Page<UserSummaryResponse>>(`${this.api}/users/all`, { params });
  }

  // ── Admin — CRUD ─────────────────────────────────────────────────────
  getUserById(id: number) {
    return this.http.get<UserResponse>(`${this.api}/users/get/${id}`);
  }

  createUserByAdmin(body: RegisterRequest) {
    return this.http.post<UserResponse>(`${this.api}/users/add-with-role`, body);
  }

  updateUserByAdmin(id: number, body: AdminUpdateUserRequest) {
    return this.http.put<UserResponse>(`${this.api}/users/update/${id}`, body);
  }

  updateUserRoles(id: number, roles: string[]) {
    return this.http.put<UserResponse>(`${this.api}/users/${id}/roles`, { roles });
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`${this.api}/users/delete/${id}`);
  }

  // ── BAN TEMPORAIRE ──────────────────────────────────────────────────
  /**
   * Ban avec durée configurable.
   * @param banUntil  null = ban permanent | date ISO = ban temporaire
   * @param reason    raison obligatoire
   */
  banUser(id: number, request: BanRequest) {
    return this.http.put<UserResponse>(`${this.api}/users/${id}/ban`, request);
  }

  unbanUser(id: number) {
    return this.http.put<UserResponse>(`${this.api}/users/${id}/unban`, {});
  }
}
