import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Evenement,
  CreateEvenementRequest,
  UpdateEvenementRequest,
  EvenementStatus,
  EvenementMateriel,
  EvenementMaterielRequestDTO
} from '../models/evenement.model';

@Injectable({ providedIn: 'root' })
export class EvenementService {

  private apiUrl = `${environment.apiUrl}/api/evenements`;

  constructor(private http: HttpClient) {}

  // ── CRUD Operations ──────────────────────────────────────

  /**
   * Create new event
   */
  addEvenement(request: CreateEvenementRequest): Observable<Evenement> {
    const payload = {
      titre: request.titre,
      description: request.description,
      dateDebut: request.dateDebut,
      dateFin: request.dateFin,
      nombreDePlaces: request.nombreDePlaces,
      salleId: request.salleId,
      status: String(request.status),
      categorie: String(request.categorie),
      prixUnitaire: request.prixUnitaire
    };
    console.log('Creating event with payload:', payload);
    return this.http.post<Evenement>(this.apiUrl, payload);
  }

  /**
   * Get all events
   */
  getAllEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(this.apiUrl);
  }

  /**
   * Get event by ID
   */
  getEvenementById(id: number): Observable<Evenement> {
    return this.http.get<Evenement>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update event
   */
  updateEvenement(id: number, request: UpdateEvenementRequest): Observable<Evenement> {
    const payload = {
      titre: request.titre,
      description: request.description,
      dateDebut: request.dateDebut,
      dateFin: request.dateFin,
      nombreDePlaces: request.nombreDePlaces,
      salleId: request.salleId,
      status: String(request.status),
      categorie: String(request.categorie),
      prixUnitaire: request.prixUnitaire
    };
    console.log('Updating event with payload:', payload);
    return this.http.put<Evenement>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete event
   */
  deleteEvenement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ── Salle assignment ────────────────────────────────────

  /**
   * Assign salle to event
   */
  assignSalle(id: number, salleId: number): Observable<Evenement> {
    return this.http.put<Evenement>(`${this.apiUrl}/${id}/salle/${salleId}`, {});
  }

  // ── Materiel management ─────────────────────────────────

  /**
   * Assign materiel to event
   */
  assignMateriel(dto: EvenementMaterielRequestDTO): Observable<EvenementMateriel> {
    return this.http.post<EvenementMateriel>(`${this.apiUrl}/materiels`, dto);
  }

  /**
   * Remove materiel from event
   */
  removeMateriel(evenementMaterielId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/materiels/${evenementMaterielId}`);
  }

  /**
   * Update materiel quantity in event
   */
  updateMaterielQuantite(evenementMaterielId: number, quantite: number): Observable<EvenementMateriel> {
    const payload = { quantite };
    console.log('Updating material quantity with payload:', payload);
    return this.http.put<EvenementMateriel>(`${this.apiUrl}/materiels/${evenementMaterielId}/quantite`, payload);
  }

  /**
   * Get materiels by event
   */
  getMaterielsByEvenement(evenementId: number): Observable<EvenementMateriel[]> {
    return this.http.get<EvenementMateriel[]>(`${this.apiUrl}/${evenementId}/materiels`);
  }

  // ── Availability & Places ───────────────────────────────

  /**
   * Get remaining places for event
   */
  getRemainingPlaces(id: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${id}/places-restantes`);
  }

  /**
   * Check if event has available places
   */
  hasAvailablePlaces(id: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${id}/available`);
  }

  /**
   * Get waitlist count for event
   */
  getWaitlistCount(id: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${id}/waitlist-count`);
  }

  // ── Filtering & Search ──────────────────────────────────

  /**
   * Get upcoming events
   */
  getUpcomingEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(`${this.apiUrl}/upcoming`);
  }

  /**
   * Get events by salle
   */
  getEvenementsBySalle(salleId: number): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(`${this.apiUrl}/salle/${salleId}`);
  }

  /**
   * Get events by date range
   */
  getEvenementsByDateRange(dateDebut: string, dateFin: string): Observable<Evenement[]> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<Evenement[]>(`${this.apiUrl}/by-date`, { params });
  }

  /**
   * Get events by status
   */
  getEvenementsByStatus(status: EvenementStatus): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(`${this.apiUrl}/status/${status}`);
  }

  /**
   * Search events by keyword
   */
  searchEvenements(keyword: string): Observable<Evenement[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Evenement[]>(`${this.apiUrl}/search`, { params });
  }

  // ── Status Update ────────────────────────────────────────

  /**
   * Update event status
   */
  updateStatus(id: number, status: EvenementStatus): Observable<Evenement> {
    const params = new HttpParams().set('status', String(status));
    return this.http.patch<Evenement>(`${this.apiUrl}/${id}/status`, {}, { params });
  }
}
