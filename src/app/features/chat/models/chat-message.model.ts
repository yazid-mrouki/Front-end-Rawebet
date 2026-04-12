export interface ChatMessage {
  id: number;
  chatSessionId: number;
  userId: number;
  username: string;
  userEmail: string;
  content: string;
  createdAt: string;
  deleted: boolean;
  edited: boolean;
  editedAt?: string;
}

export interface UnsendEvent {
  messageId: number;
  forEveryone: boolean;
}

// Broadcasted via WebSocket après chaque réaction
export interface ReactionEvent {
  messageId: number;
  counts: Record<string, number>;   // emoji → count
  users: Record<string, string[]>;  // emoji → [username, ...]
}

// Chargement initial REST : par messageId
export interface SessionReactions {
  counts: Record<string, number>;
  users: Record<string, string[]>;
}

export interface MessagePage {
  messages: ChatMessage[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
}