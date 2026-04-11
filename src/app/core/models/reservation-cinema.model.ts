export interface ReservationCinemaEntity {
  id: number;
  dateReservation: string | null;
  statut: string | null;
  user: { id: number } | null;
  seance: { id: number } | null;
  seat: { id: number; numero?: number | null } | null;
  paiement: { id: number } | null;
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
  seatNumero: number;
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
