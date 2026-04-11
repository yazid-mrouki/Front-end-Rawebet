export interface ClubMember {

  id: number;

  userId: number;

  userName: string;

  status: 'ACTIVE' | 'LEFT';

  joinedAt: string;

}