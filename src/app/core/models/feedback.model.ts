export interface FeedbackResponse {
  id: number;
  note: number;
  commentaire: string;
  date: string | null;
  userId: number | null;
  filmId: number | null;
}

export interface CreateFeedbackRequest {
  userId: number;
  filmId: number;
  commentaire: string;
  note: number;
}

export interface UpdateFeedbackRequest {
  id: number;
  userId: number;
  filmId: number;
  commentaire: string;
  note: number;
}
