import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CreateReservationCinemaRequest,
  ReservationCinemaEntity,
  ReservationCinemaResponse,
  UpdateReservationCinemaRequest,
} from '../models/reservation-cinema.model';

@Injectable({ providedIn: 'root' })
export class ReservationCinemaService {
  private readonly apiUrl = `${environment.apiUrl}/reservations`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ReservationCinemaEntity[]> {
    return this.http.get<ReservationCinemaEntity[]>(`${this.apiUrl}/all?_=${Date.now()}`);
  }

  getByUserId(userId: number): Observable<ReservationCinemaEntity[]> {
    return this.http.get<ReservationCinemaEntity[]>(`${this.apiUrl}/all?userId=${userId}&_=${Date.now()}`);
  }

  getById(id: number): Observable<ReservationCinemaEntity> {
    const apiUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:8081/rawabet/reservations`
      : this.apiUrl;
    return this.http.get<ReservationCinemaEntity>(`${apiUrl}/${id}?_=${Date.now()}`);
  }

  add(request: CreateReservationCinemaRequest): Observable<ReservationCinemaResponse> {
    const seatNumero = request.seatNumero ?? request.seatId ?? 0;
    if (seatNumero === null || seatNumero === 0) {
      throw new Error('Seat numero is required');
    }
    const payload = {
      userId: Number(request.userId),
      seanceId: Number(request.seanceId),
      seatNumero: Number(seatNumero),
    };
    return this.http.post(`${this.apiUrl}/reserver`, payload, { responseType: 'text' }).pipe(
      map(() => ({
        id: 0,
        dateReservation: '',
        statut: 'PENDING',
        userId: payload.userId,
        seanceId: payload.seanceId,
        seatId: Number(seatNumero),
      }))
    );
  }

  update(request: UpdateReservationCinemaRequest): Observable<ReservationCinemaEntity> {
    const payload = {
      id: Number(request.id),
      dateReservation: request.dateReservation,
      statut: request.statut,
      user: { id: Number(request.userId) },
      seance: { id: Number(request.seanceId) },
      seat: { id: Number(request.seatId) },
      paiement: request.paiementId ? { id: Number(request.paiementId) } : null,
    };
    return this.http.put(`${this.apiUrl}/update`, payload, { responseType: 'text' as const }).pipe(
      map(() => payload as ReservationCinemaEntity)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`, { responseType: 'text' as const }).pipe(
      map(() => void 0)
    );
  }
}
