export interface ClubJoinRequest {

  id: number;

  userId: number;

  userName: string;

  motivation: string;

  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  requestDate: string;

  processedDate: string | null;

}