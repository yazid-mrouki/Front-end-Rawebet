export interface SeanceFilm {
  id: number;
  title: string;
  genre: string;
  durationMinutes: number;
}

export interface SeanceSalleCinema {
  id: number;
  name: string;
}

export interface Seance {
  id: number;
  dateHeure: string;
  prixBase: number;
  langue: string;
  filmId: number;
  filmTitle?: string;
  salleCinemaId: number;
  salleCinemaName?: string;
}

export interface SeanceResponse extends Seance {
  film?: SeanceFilm | null;
  salleCinema?: SeanceSalleCinema | null;
}

export interface SeancePayload {
  dateHeure: string;
  prixBase: number;
  langue: string;
  filmId: number;
  salleCinemaId: number;
}
