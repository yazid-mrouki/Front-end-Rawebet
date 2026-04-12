import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserResponse, UpdateProfileRequest, ChangePasswordRequest, RegisterRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMe() { return this.http.get<UserResponse>(`${this.api}/users/me`); }

  updateMe(body: UpdateProfileRequest) {
    return this.http.put<UserResponse>(`${this.api}/users/me/update`, body);
  }

  changePassword(body: ChangePasswordRequest) {
    return this.http.put(`${this.api}/users/me/password`, body, {
      responseType: 'text'
    });
  }

  getAllUsers() { return this.http.get<UserResponse[]>(`${this.api}/users/all`); }

  banUser(id: number) {
    return this.http.put(`${this.api}/users/${id}/ban`, {}, {
      responseType: 'text'
    });
  }

  unbanUser(id: number) {
    return this.http.put(`${this.api}/users/${id}/unban`, {}, {
      responseType: 'text'
    });
  }

  createUserByAdmin(body: { nom: string; email: string; password: string; roles: string[] }) {
    return this.http.post<any>(`${this.api}/users/add-with-role`, body);
  }

  updateUserRoles(id: number, roles: string[]) {
    return this.http.put<UserResponse>(`${this.api}/users/${id}/roles`, { roles });
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`${this.api}/users/delete/${id}`);
  }
}
