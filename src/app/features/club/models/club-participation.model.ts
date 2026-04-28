export interface ClubParticipation {

  id: number;

  eventId: number;

  eventTitle: string;

  reservedPlaces: number;

  remainingPlaces: number;

  status: 'CONFIRMED' | 'CANCELLED';

  reservationDate: string;

}