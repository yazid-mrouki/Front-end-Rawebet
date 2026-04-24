import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cinema, CreateCinemaRequest } from '../models/cinema.model';

@Injectable({ providedIn: 'root' })
export class CinemaService {

  private publicUrl = `${environment.apiUrl}/api/cinemas`;      // ← /api/ ajouté
  private adminUrl  = `${environment.apiUrl}/api/admin/cinemas`; // ← /api/ ajouté

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cinema[]> {
    return this.http.get<Cinema[]>(this.publicUrl);
  }

  getById(id: number): Observable<Cinema> {
    return this.http.get<Cinema>(`${this.publicUrl}/${id}`);
  }

  create(payload: CreateCinemaRequest): Observable<Cinema> {
    return this.http.post<Cinema>(this.adminUrl, payload);
  }

  disable(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}