import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SeatOption {
  id: number;
  numero: number;
}

@Injectable({ providedIn: 'root' })
export class SeatService {
  private readonly apiUrl = `${environment.apiUrl}/seats`;

  constructor(private readonly http: HttpClient) {}

  getSeatsBySeance(seanceId: number): Observable<SeatOption[]> {
    return this.http.get<SeatOption[]>(`${this.apiUrl}/seance/${seanceId}`);
  }
}
