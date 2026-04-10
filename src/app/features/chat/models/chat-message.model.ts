export interface ChatMessage {
  id: number;
  chatSessionId: number;
  userId: number;
  username: string;
  userEmail: string;
  content: string;
  createdAt: string;
}