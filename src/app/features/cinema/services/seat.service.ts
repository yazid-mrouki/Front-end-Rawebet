import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Seat, SeatRowResponse, ConfigureHallRequest } from '../models/seat.model';

@Injectable({ providedIn: 'root' })
export class SeatService {

  private baseUrl = `${environment.apiUrl}/api/seats`;

  constructor(private http: HttpClient) {}

  getBySalle(salleId: number): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.baseUrl}/salle/${salleId}`);
  }

  getRowsBySalle(salleId: number): Observable<SeatRowResponse[]> {
    return this.http.get<SeatRowResponse[]>(`${this.baseUrl}/salle/${salleId}/rows`);
  }

  configureHall(payload: ConfigureHallRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/configure`, payload);
  }

  disable(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}