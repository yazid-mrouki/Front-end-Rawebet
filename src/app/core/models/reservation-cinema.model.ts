import { SeanceResponse } from './seance.model';

export interface ReservationCinemaEntity {
  id: number;
  dateReservation: string | null;
  statut: string | null;
  user?: { id: number } | null;
  userId?: number;
  seance?: SeanceResponse | null;
  seanceId?: number;
  seat?: { id: number; seatNumber?: number | null } | null;
  seatId?: number;
  paiement?: { id: number } | null;
  paiementId?: number;
}

export interface ReservationCinemaResponse {
  id: number;
  dateReservation: string;
  statut: string;
  userId: number;
  seanceId: number;
  seatId: number;
}

export interface CreateReservationCinemaRequest {
  userId: number;
  seanceId: number;
  seatNumero: number | null;
  seatId?: number;
}

export interface UpdateReservationCinemaRequest {
  id: number;
  dateReservation: string;
  statut: string;
  userId: number;
  seanceId: number;
  seatId: number;
  paiementId?: number | null;
}
