import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Film, CreateFilmRequest } from '../models/film.model';

@Injectable({ providedIn: 'root' })
export class FilmService {

  private baseUrl = `${environment.apiUrl}/api/films`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Film[]> {
    return this.http.get<Film[]>(this.baseUrl);
  }

  getById(id: number): Observable<Film> {
    return this.http.get<Film>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateFilmRequest): Observable<Film> {
    return this.http.post<Film>(this.baseUrl, payload);
  }

  disable(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── Prédiction fenêtre d'exploitation ───────────────────────
  predictRoi(payload: {
    title:         string;
    budget:        number;
    runtime:       number;
    release_year:  number;
    release_month: number;
    release_date:  string;
    language:      string;
    genres:        string[];
    overview:      string;
  }): Observable<{
    ai_score:              number;
    temporal_score:        number;
    final_score:           number;
    temporal_label:        string;
    temporal_status:       string;
    weeks_since_release:   number | null;
    recommendation:        string;
    recommendation_level:  string;
    label:                 string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/roi-predict`, payload);
  }
}