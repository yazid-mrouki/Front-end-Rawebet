// ── ReservationMateriel Status Enum ─────────────────────────────

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  RETURNED_PARTIAL = 'RETURNED_PARTIAL'
}

// ── ReservationMateriel Entity ──────────────────────────────────

export interface ReservationMateriel {
  id: number;
  quantite: number;
  dateDebut: string;  // LocalDateTime ISO format
  dateFin: string;    // LocalDateTime ISO format
  statut: ReservationStatus | string;
  userId: number;
  userNom: string;
  materielId: number;
  materielNom: string;
  materielReference: string;
  prixUnitaire: number;
}

// ── Request DTOs ───────────────────────────────────────────────

export interface ReservationMaterielRequestDTO {
  userId: number;
  materielId: number;
  quantite: number;
  dateDebut: string;  // ISO format
  dateFin: string;    // ISO format
}

export interface ExtendReservationMaterielRequestDTO {
  nouvelleDataFin: string; // ISO format LocalDateTime
}

export interface RetourPartielRequestDTO {
  quantiteRetournee: number;
}

// ── Response DTOs ───────────────────────────────────────────────

export interface ReservationMaterielResponseDTO extends ReservationMateriel {}

// ── Reservation Action Results ──────────────────────────────────

export interface ReservationActionResult {
  success: boolean;
  message?: string;
  reservation?: ReservationMateriel;
}
