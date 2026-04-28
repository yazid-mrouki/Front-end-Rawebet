import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EventSpace, CreateEventSpaceRequest, UpdateEventSpaceRequest, SalleType, SalleStatus } from '../models/event-space.model';

@Injectable({ providedIn: 'root' })
export class EventSpaceService {

  private apiUrl = `${environment.apiUrl}/api/salles`;

  constructor(private http: HttpClient) {}

  // ── CRUD Operations ──────────────────────────────────────

  /**
   * Create new event space
   */
  addSalle(request: CreateEventSpaceRequest): Observable<EventSpace> {
    const payload = {
      nom: request.nom,
      capacite: request.capacite,
      type: String(request.type),
      status: String(request.status)
    };
    console.log('Sending payload:', payload);
    return this.http.post<EventSpace>(this.apiUrl, payload);
  }

  /**
   * Get all event spaces
   */
  getAllSalles(): Observable<EventSpace[]> {
    return this.http.get<EventSpace[]>(this.apiUrl);
  }

  /**
   * Get event space by ID
   */
  getSalleById(id: number): Observable<EventSpace> {
    return this.http.get<EventSpace>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update event space
   */
  updateSalle(id: number, request: UpdateEventSpaceRequest): Observable<EventSpace> {
    const payload = {
      nom: request.nom,
      capacite: request.capacite,
      type: String(request.type),
      status: String(request.status)
    };
    console.log('Updating with payload:', payload);
    return this.http.put<EventSpace>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete event space
   */
  deleteSalle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ── Availability ─────────────────────────────────────────

  /**
   * Check if salle is available for a specific date range
   */
  isSalleAvailable(id: number, dateDebut: string, dateFin: string): Observable<boolean> {
    let params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<boolean>(`${this.apiUrl}/${id}/available`, { params });
  }

  /**
   * Get all available salles for a specific date range
   */
  getAvailableSalles(dateDebut: string, dateFin: string): Observable<EventSpace[]> {
    let params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<EventSpace[]>(`${this.apiUrl}/available`, { params });
  }

  // ── Filtering ────────────────────────────────────────────

  /**
   * Get salles by type
   */
  getSallesByType(type: SalleType): Observable<EventSpace[]> {
    return this.http.get<EventSpace[]>(`${this.apiUrl}/type/${type}`);
  }

  // ── Status Update ────────────────────────────────────────

  /**
   * Update salle status (ACTIVE or MAINTENANCE)
   */
  updateStatus(id: number, status: SalleStatus): Observable<EventSpace> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<EventSpace>(`${this.apiUrl}/${id}/status`, {}, { params });
  }
}
