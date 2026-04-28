import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Materiel,
  CreateMaterielRequest,
  UpdateMaterielRequest,
  MaterielStatus,
  MaterielResponseDTO,
  MaterielAvailabilityResponse
} from '../models/materiel.model';

@Injectable({ providedIn: 'root' })
export class MaterielService {

  private apiUrl = `${environment.apiUrl}/api/materiels`;

  constructor(private http: HttpClient) {}

  // ── CRUD Operations ──────────────────────────────────────

  /**
   * Create new material
   */
  addMateriel(request: CreateMaterielRequest): Observable<MaterielResponseDTO> {
    const payload = {
      nom: request.nom,
      description: request.description,
      reference: request.reference,
      quantiteTotale: request.quantiteTotale,
      prixUnitaire: request.prixUnitaire,
      status: String(request.status),
      categorieId: request.categorieId
    };
    console.log('Creating material with payload:', payload);
    return this.http.post<MaterielResponseDTO>(this.apiUrl, payload);
  }

  /**
   * Get all materials
   */
  getAllMateriels(): Observable<Materiel[]> {
    return this.http.get<Materiel[]>(this.apiUrl);
  }

  /**
   * Get material by ID
   */
  getMaterielById(id: number): Observable<Materiel> {
    return this.http.get<Materiel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update material
   */
  updateMateriel(id: number, request: UpdateMaterielRequest): Observable<MaterielResponseDTO> {
    const payload = {
      nom: request.nom,
      description: request.description,
      reference: request.reference,
      quantiteTotale: request.quantiteTotale,
      prixUnitaire: request.prixUnitaire,
      status: String(request.status),
      categorieId: request.categorieId
    };
    console.log('Updating material with payload:', payload);
    return this.http.put<MaterielResponseDTO>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete material
   */
  deleteMateriel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ── Availability ────────────────────────────────────────

  /**
   * Check if material is available for given quantity and date range
   */
  isMaterielAvailable(id: number, quantite: number, dateDebut: string, dateFin: string): Observable<boolean> {
    const params = new HttpParams()
      .set('quantite', quantite.toString())
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<boolean>(`${this.apiUrl}/${id}/available`, { params });
  }

  /**
   * Get available quantity for material in date range
   */
  getAvailableQuantity(id: number, dateDebut: string, dateFin: string): Observable<number> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<number>(`${this.apiUrl}/${id}/available-quantity`, { params });
  }

  /**
   * Get available materials for date range
   */
  getAvailableMateriels(dateDebut: string, dateFin: string): Observable<Materiel[]> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<Materiel[]>(`${this.apiUrl}/available`, { params });
  }

  // ── Filters ──────────────────────────────────────────────

  /**
   * Get materials by category
   */
  getMaterielsByCategorie(categorieId: number): Observable<Materiel[]> {
    return this.http.get<Materiel[]>(`${this.apiUrl}/categorie/${categorieId}`);
  }

  /**
   * Toggle disponible status
   */
  toggleDisponible(id: number): Observable<MaterielResponseDTO> {
    return this.http.patch<MaterielResponseDTO>(`${this.apiUrl}/${id}/toggle-disponible`, {});
  }

  /**
   * Update material status
   */
  updateStatus(id: number, status: MaterielStatus | string): Observable<MaterielResponseDTO> {
    const params = new HttpParams().set('status', String(status));
    return this.http.patch<MaterielResponseDTO>(`${this.apiUrl}/${id}/status`, {}, { params });
  }

  /**
   * Get materials by status
   */
  getMaterielsByStatus(status: MaterielStatus | string): Observable<Materiel[]> {
    return this.http.get<Materiel[]>(`${this.apiUrl}/status/${status}`);
  }

  /**
   * Get full occupation/reservations for a material
   */
  getFullOccupation(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/occupation`);
  }
}
