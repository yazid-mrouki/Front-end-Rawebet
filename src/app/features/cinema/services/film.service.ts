import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Film, CreateFilmRequest } from '../models/film.model';

@Injectable({ providedIn: 'root' })
export class FilmService {

  private baseUrl = `${environment.apiUrl}/api/films`; // ← /api/ ajouté

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
}