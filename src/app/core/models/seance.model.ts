export interface SeanceResponse {
  id: number;
  dateHeure: string;
  prixBase: number;
  langue: string;
  filmId: number | null;
  salleCinemaId: number | null;
}
