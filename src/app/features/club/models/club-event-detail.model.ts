export interface ClubEventParticipant {
  participationId: number;
  userId: number;
  userName: string;
  reservedPlaces: number;
  reservationDate: string;
}

export interface ClubEventDetail {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  maxPlaces: number;
  reservedPlaces: number;
  remainingPlaces: number;
  posterUrl: string;
  createdAt: string;
  /** null pour les non-admins */
  participants: ClubEventParticipant[] | null;
}