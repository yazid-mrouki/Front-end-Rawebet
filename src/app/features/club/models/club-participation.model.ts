export interface ClubParticipation {

  id: number;

  eventId: number;

  eventTitle: string;

  reservedPlaces: number;

  status: 'CONFIRMED' | 'CANCELLED';

  reservationDate: string;

}