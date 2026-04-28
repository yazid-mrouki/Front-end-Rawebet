// ─────────────────────────────────────────────────────────
// Reservation Evenement (Event Reservation) Models
// ─────────────────────────────────────────────────────────

export enum ReservationStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

export interface ReservationEvenement {
  id: number;
  dateReservation: string; // LocalDateTime ISO format
  dateExpiration?: string; // LocalDateTime ISO format (null for waitlist)
  phoneNumber: string;
  statut: ReservationStatus | string;
  attribut: ReservationEvenementAttribut | string;  // ✅ NEW FIELD
  enAttente: boolean;
  userId: number;
  userNom: string;
  evenementId: number;
  evenementTitre: string;
  evenementDateDebut: string;
  evenementDateFin: string;
  salleNom?: string;
}

// ── Request DTOs ───────────────────────────────────────────────

export interface ReservationEvenementRequestDTO {
  userId: number;
  evenementId: number;
  phoneNumber: string;
}
export enum ReservationEvenementAttribut {
  CONFIRMED = 'Confirmed',
  ALREADY_USED = 'Already Used'
}
// ── Response DTOs ──────────────────────────────────────────────

export interface ReservationEvenementResponseDTO extends ReservationEvenement {}

// ── Filter Results ────────────────────────────────────────────

export interface WaitlistItem {
  id: number;
  userNom: string;
  userId: number;
  position: number;
}
