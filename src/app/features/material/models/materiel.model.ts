// ── Materiel Status Enum ────────────────────────────────────────────

export enum MaterielStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED'
}

// ── Materiel Entity ─────────────────────────────────────────────────

export interface Materiel {
  id: number;
  nom: string;
  description: string;
  reference: string;
  quantiteTotale: number;  // Changed from quantiteDisponible
  prixUnitaire: number;
  status: MaterielStatus | string;
  categorieId?: number;
  categorieNom?: string;
  categorie?: {
    id: number;
    nom: string;
    description: string;
  };
  riskLevel?: 'AT_RISK' | 'MODERATE_RISK' | 'SAFE' | 'INSUFFICIENT_DATA' | 'UNKNOWN' | 'UNAVAILABLE' | string;
  riskBadge?: string;
  damageProbability?: number;
  damageProbabilityPct?: string;
  riskMessage?: string;
  needsMaintenance?: boolean;
  newMaterial?: boolean;
  mlAvailable?: boolean;
}

// ── Request DTOs ────────────────────────────────────────────────────

export interface CreateMaterielRequest {
  nom: string;
  description: string;
  reference: string;
  quantiteTotale: number;
  prixUnitaire: number;
  status: MaterielStatus | string;
  categorieId: number;
}

export interface UpdateMaterielRequest {
  id?: number;
  nom: string;
  description: string;
  reference: string;
  quantiteTotale: number;
  prixUnitaire: number;
  status: MaterielStatus | string;
  categorieId: number;
}

// ── Response DTOs ───────────────────────────────────────────────────

export interface MaterielResponseDTO {
  id: number;
  nom: string;
  description: string;
  reference: string;
  quantiteTotale: number;
  prixUnitaire: number;
  status: MaterielStatus | string;
  categorieId?: number;
  categorieNom?: string;
  riskLevel?: 'AT_RISK' | 'MODERATE_RISK' | 'SAFE' | 'INSUFFICIENT_DATA' | 'UNKNOWN' | 'UNAVAILABLE' | string;
  riskBadge?: string;
  damageProbability?: number;
  damageProbabilityPct?: string;
  riskMessage?: string;
  needsMaintenance?: boolean;
  newMaterial?: boolean;
  mlAvailable?: boolean;
}

// ── Availability Request ────────────────────────────────────────────

export interface CheckMaterielAvailabilityRequest {
  materielId: number;
  quantite: number;
  dateDebut: string; // ISO format
  dateFin: string;   // ISO format
}

export interface MaterielAvailabilityResponse {
  disponible: boolean;
  quantiteDisponible: number;
}
