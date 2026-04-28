import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime?: number;
  poster_path: string;
  backdrop_path: string;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  vote_average: number;
  original_language: string;
  imdb_id?: string;
  // ── Champs présents dans /movie/{id} (détails complets) ──────
  budget?: number;
  popularity?: number;
}

export interface TmdbCredits {
  cast: { name: string; character: string; order: number }[];
  crew: { name: string; job: string; department: string }[];
}

export interface TmdbVideos {
  results: { key: string; site: string; type: string; official: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class TmdbService {

  private base = 'https://api.themoviedb.org/3';
  private imgBase = 'https://image.tmdb.org/t/p';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${environment.tmdbToken}`,
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) {}

  search(query: string): Observable<{ results: TmdbMovie[] }> {
    return this.http.get<{ results: TmdbMovie[] }>(
      `${this.base}/search/movie?query=${encodeURIComponent(query)}&language=fr-FR&page=1`,
      { headers: this.headers }
    );
  }

  getDetails(tmdbId: number): Observable<TmdbMovie> {
    return this.http.get<TmdbMovie>(
      `${this.base}/movie/${tmdbId}?language=fr-FR`,
      { headers: this.headers }
    );
  }

  getCredits(tmdbId: number): Observable<TmdbCredits> {
    return this.http.get<TmdbCredits>(
      `${this.base}/movie/${tmdbId}/credits?language=fr-FR`,
      { headers: this.headers }
    );
  }

  getVideos(tmdbId: number): Observable<TmdbVideos> {
    return this.http.get<TmdbVideos>(
      `${this.base}/movie/${tmdbId}/videos?language=fr-FR`,
      { headers: this.headers }
    );
  }

  getPosterUrl(path: string, size: 'w300' | 'w500' | 'original' = 'w500'): string {
    return path ? `${this.imgBase}/${size}${path}` : '';
  }

  getBackdropUrl(path: string): string {
    return path ? `${this.imgBase}/original${path}` : '';
  }
}