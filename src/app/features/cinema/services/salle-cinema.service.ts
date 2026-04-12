import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SalleCinema, CreateSalleRequest } from '../models/salle-cinema.model';

@Injectable({ providedIn: 'root' })
export class SalleCinemaService {

  private baseUrl = `${environment.apiUrl}/api/salles-cinema`; // ← /api/ ajouté

  constructor(private http: HttpClient) {}

  getByCinema(cinemaId: number): Observable<SalleCinema[]> {
    return this.http.get<SalleCinema[]>(`${this.baseUrl}/cinema/${cinemaId}`);
  }

  getById(id: number): Observable<SalleCinema> {
    return this.http.get<SalleCinema>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateSalleRequest): Observable<SalleCinema> {
    return this.http.post<SalleCinema>(this.baseUrl, payload);
  }

  disable(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}