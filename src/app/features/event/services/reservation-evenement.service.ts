import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ReservationEvenement,
  ReservationEvenementRequestDTO,
  ReservationEvenementResponseDTO,
  ReservationStatus
} from '../models/reservation-evenement.model';

// ... existing imports ...

@Injectable({ providedIn: 'root' })
export class ReservationEvenementService {

  private apiUrl = `${environment.apiUrl}/api/reservations-evenement`;

  constructor(private http: HttpClient) {}

  // ── Core Booking ─────────────────────────────────────────

  reserver(dto: ReservationEvenementRequestDTO): Observable<ReservationEvenementResponseDTO> {
    return this.http.post<ReservationEvenementResponseDTO>(`${this.apiUrl}/reserver`, {
      userId: dto.userId,
      evenementId: dto.evenementId,
      phoneNumber: dto.phoneNumber
    });
  }

  annuler(id: number): Observable<ReservationEvenementResponseDTO> {
    return this.http.put<ReservationEvenementResponseDTO>(`${this.apiUrl}/${id}/annuler`, {});
  }

  confirmer(id: number): Observable<ReservationEvenementResponseDTO> {
    return this.http.put<ReservationEvenementResponseDTO>(`${this.apiUrl}/${id}/confirmer`, {});
  }

  /**
   * Mark a reservation as already used
   */
  markAsAlreadyUsed(id: number): Observable<ReservationEvenementResponseDTO> {
    return this.http.put<ReservationEvenementResponseDTO>(`${this.apiUrl}/${id}/already-used`, {});
  }

  // ── CRUD Operations ──────────────────────────────────────

  getById(id: number): Observable<ReservationEvenement> {
    return this.http.get<ReservationEvenement>(`${this.apiUrl}/${id}`);
  }

  getAll(): Observable<ReservationEvenement[]> {
    return this.http.get<ReservationEvenement[]>(this.apiUrl);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ── Filters ──────────────────────────────────────────────

  getByUser(userId: number): Observable<ReservationEvenement[]> {
    return this.http.get<ReservationEvenement[]>(`${this.apiUrl}/user/${userId}`);
  }

  getByEvenement(evenementId: number): Observable<ReservationEvenement[]> {
    return this.http.get<ReservationEvenement[]>(`${this.apiUrl}/evenement/${evenementId}`);
  }

  getByStatus(statut: ReservationStatus | string): Observable<ReservationEvenement[]> {
    return this.http.get<ReservationEvenement[]>(`${this.apiUrl}/status/${statut}`);
  }

  userAlreadyReserved(userId: number, evenementId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check`, {
      params: { userId: userId.toString(), evenementId: evenementId.toString() }
    });
  }

  getWaitlistByEvenement(evenementId: number): Observable<ReservationEvenement[]> {
    return this.http.get<ReservationEvenement[]>(`${this.apiUrl}/evenement/${evenementId}/waitlist`);
  }

  getUserWaitlist(userId: number): Observable<ReservationEvenement[]> {
    return this.http.get<ReservationEvenement[]>(`${this.apiUrl}/user/${userId}/waitlist`);
  }
}
