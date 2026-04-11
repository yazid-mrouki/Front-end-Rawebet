export interface UserResponse {
  id: number;
  nom: string;
  email: string;
  roles: string[];
  active: boolean;
  loyaltyLevel?: string;
  loyaltyPoints?: number;
  createdAt?: string;
  dateInscription?: string;
}

export interface UpdateProfileRequest {
  nom: string;
  email: string;
}
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  nom: string;
  email: string;
  password: string;
  roles?: string[];
}
