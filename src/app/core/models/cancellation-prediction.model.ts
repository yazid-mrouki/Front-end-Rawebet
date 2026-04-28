export type CancellationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CancellationPredictionTicketInput {
  reservationId: number;
  userId: number;
  seanceId: number;
  dateReservation?: string | null;
  seanceDateHeure?: string | null;
  prixBase?: number | null;
  langue?: string | null;
  filmGenre?: string | null;
  seatNumber?: number | null;
  userTotalBookings: number;
  userCancelledBookings: number;
  userRecentBookings30d: number;
  loyaltyLevel?: string | null;
  loyaltyPoints?: number | null;
  statut?: string | null;
}

export interface CancellationPredictionBatchRequest {
  tickets: CancellationPredictionTicketInput[];
}

export interface CancellationPredictionResult {
  reservationId: number;
  cancellationProbability: number;
  riskLevel: CancellationRiskLevel;
  recommendedAction: string;
}

export interface CancellationPredictionBatchResponse {
  modelVersion: string;
  trainedAt: string;
  datasetSize: number;
  predictions: CancellationPredictionResult[];
}
