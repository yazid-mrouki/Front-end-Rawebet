import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ReservationMateriel,
  ReservationMaterielRequestDTO,
  ReservationMaterielResponseDTO,
  ReservationStatus,
  ExtendReservationMaterielRequestDTO,
  RetourPartielRequestDTO
} from '../models/reservation-materiel.model';

@Injectable({ providedIn: 'root' })
export class ReservationMaterielService {

  private apiUrl = `${environment.apiUrl}/api/reservations-materiel`;
  markAsAlreadyUsed: any;

  constructor(private http: HttpClient) {}

  // ── Core Booking ─────────────────────────────────────────

  /**
   * Reserve material
   */
  reserver(dto: ReservationMaterielRequestDTO): Observable<ReservationMaterielResponseDTO> {
    const payload = {
      userId: dto.userId,
      materielId: dto.materielId,
      quantite: dto.quantite,
      dateDebut: dto.dateDebut,
      dateFin: dto.dateFin
    };
    console.log('Reserving material with payload:', payload);
    return this.http.post<ReservationMaterielResponseDTO>(`${this.apiUrl}/reserver`, payload);
  }

  /**
   * Cancel reservation
   */
  annuler(id: number): Observable<ReservationMaterielResponseDTO> {
    return this.http.put<ReservationMaterielResponseDTO>(`${this.apiUrl}/${id}/annuler`, {});
  }

  /**
   * Confirm reservation
   */
  confirmer(id: number): Observable<ReservationMaterielResponseDTO> {
    return this.http.put<ReservationMaterielResponseDTO>(`${this.apiUrl}/${id}/confirmer`, {});
  }

  // ── CRUD Operations ──────────────────────────────────────

  /**
   * Get reservation by ID
   */
  getById(id: number): Observable<ReservationMateriel> {
    return this.http.get<ReservationMateriel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all reservations
   */
  getAll(): Observable<ReservationMateriel[]> {
    return this.http.get<ReservationMateriel[]>(this.apiUrl);
  }

  /**
   * Delete reservation
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ── Filters ──────────────────────────────────────────────

  /**
   * Get reservations by user
   */
  getByUser(userId: number): Observable<ReservationMateriel[]> {
    return this.http.get<ReservationMateriel[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Get reservations by status
   */
  getByStatus(statut: ReservationStatus | string): Observable<ReservationMateriel[]> {
    return this.http.get<ReservationMateriel[]>(`${this.apiUrl}/status/${statut}`);
  }

  // ── Actions ──────────────────────────────────────────────

  /**
   * Extend reservation end date
   */
  extend(id: number, nouvelleDataFin: string): Observable<ReservationMaterielResponseDTO> {
    const dto: ExtendReservationMaterielRequestDTO = { nouvelleDataFin };
    return this.http.put<ReservationMaterielResponseDTO>(`${this.apiUrl}/${id}/extend`, dto);
  }

  /**
   * Partial return of material
   */
  retourPartiel(id: number, quantiteRetournee: number): Observable<ReservationMaterielResponseDTO> {
    const dto: RetourPartielRequestDTO = { quantiteRetournee };
    return this.http.put<ReservationMaterielResponseDTO>(`${this.apiUrl}/${id}/retour-partiel`, dto);
  }
}
