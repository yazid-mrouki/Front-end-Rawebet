import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<ReservationCinemaEntity[]>(`${this.apiUrl}/all`);
  }

  add(request: CreateReservationCinemaRequest): Observable<ReservationCinemaResponse> {
    return this.http.post<ReservationCinemaResponse>(`${this.apiUrl}/reserver`, {
      userId: request.userId,
      seanceId: request.seanceId,
      seatNumero: request.seatNumero ?? request.seatId ?? 0,
    });
  }

  update(request: UpdateReservationCinemaRequest): Observable<ReservationCinemaEntity> {
    return this.http.put<ReservationCinemaEntity>(`${this.apiUrl}/update`, {
      id: request.id,
      dateReservation: request.dateReservation,
      statut: request.statut,
      user: { id: request.userId },
      seance: { id: request.seanceId },
      seat: { id: request.seatId },
      paiement: request.paiementId ? { id: request.paiementId } : null,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${id}`);
  }
}
