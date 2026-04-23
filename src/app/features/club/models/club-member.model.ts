export interface ClubMember {
  id: number;
  userId: number;
  userName: string;
  status: 'ACTIVE' | 'LEFT' | 'REMOVED';
  joinedAt: string;
  removeReason: string | null;
  removedAt: string | null;
}