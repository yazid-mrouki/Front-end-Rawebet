// ── Profil complet ─────────────────────────────────────────────────────────
export interface UserResponse {
  id: number;
  nom: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  roles: string[];
  active: boolean;
  loyaltyLevel?: string;
  loyaltyPoints?: number;
  createdAt?: string;
  // Ban temporaire
  banUntil?: string | null;
  banReason?: string | null;
  // Sécurité connexion
  loginFailedAttempts?: number;
  loginLockedUntil?: string | null;
}

// ── Liste admin — résumé (sans loyaltyLevel pour éviter N+1) ──────────────
export interface UserSummaryResponse {
  id: number;
  nom: string;
  email: string;
  avatarUrl?: string;
  roles: string[];
  active: boolean;
  createdAt?: string;
  banUntil?: string | null;
  banReason?: string | null;
}

// ── Pagination Spring Boot ─────────────────────────────────────────────────
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface UpdateProfileRequest { nom: string; email: string; }
export interface ChangePasswordRequest { oldPassword: string; newPassword: string; }
// ── Requêtes ────────────────────────────────────────────────────────────────
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

export interface AdminUpdateUserRequest {
  nom: string;
  email: string;
  password?: string;
}

/**
 * Requête de ban temporaire ou permanent.
 * banUntil = null  → ban permanent
 * banUntil = date ISO → ban temporaire (ex: "2026-05-01T18:00:00")
 */
export interface BanRequest {
  banUntil: string | null;
  reason: string;
}
