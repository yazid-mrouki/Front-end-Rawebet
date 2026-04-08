export interface UserResponse {
  id: number;
  nom: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface UpdateProfileRequest { nom: string; email: string; }
export interface ChangePasswordRequest { oldPassword: string; newPassword: string; }

export interface RegisterRequest {
  nom: string;
  email: string;
  password: string;
  roles?: string[];
}
