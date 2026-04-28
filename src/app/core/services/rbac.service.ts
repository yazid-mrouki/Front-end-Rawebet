import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PermissionResponse, RoleResponse } from '../models/rbac.model';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPermissions() {
    return this.http.get<PermissionResponse[]>(`${this.api}/permissions/all`);
  }

  createRole(name: string, permissions: string[]) {
    return this.http.post<RoleResponse>(`${this.api}/roles/create`, { name, permissions });
  }

  updateRole(id: number, body: { name: string; permissions: string[] }) {
    return this.http.put<RoleResponse>(`${this.api}/roles/update/${id}`, body);
  }

  deleteRole(id: number) {
    return this.http.delete<void>(`${this.api}/roles/delete/${id}`);
  }

  getRoles() {
    return this.http.get<RoleResponse[]>(`${this.api}/roles/all`);
  }
}
