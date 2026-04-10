export interface ChatSession {
  id: number;
  seanceId: number;
  name: string;
  code: string;
  active: boolean;
  startTime: string;
  endTime: string;
  createdAt: string;
}