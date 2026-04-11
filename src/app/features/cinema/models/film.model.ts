export interface Film {
  id: number;
  title: string;
  synopsis: string;
  durationMinutes: number;
  language: string;
  genre: string;
  director: string;
  rating: string;
  releaseDate: string;
  posterUrl: string;
  trailerUrl: string;   // ← AJOUTER
  averageRating: number;
  totalReviews: number;
}

export interface CreateFilmRequest {
  title: string;
  synopsis: string;
  durationMinutes: number;
  language: string;
  genre: string;
  director: string;
  castSummary: string;
  rating: string;
  releaseDate: string;
  posterUrl: string;
  trailerUrl: string;
  imdbId: string;
}