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
  trailerUrl: string;
  averageRating: number;
  totalReviews: number;
  // ── Prédiction ROI ──────────────────────────────────────────
  profitable: boolean | null;
  roiConfidence: number | null;
  roiLabel: string | null;
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
  // ── Champs ROI envoyés depuis TMDB ──────────────────────────
  budget: number | null;
  popularity: number | null;
}