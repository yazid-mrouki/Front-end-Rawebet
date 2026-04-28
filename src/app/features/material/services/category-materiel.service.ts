import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CategorieMateriel,
  CreateCategorieMaterielRequest,
  UpdateCategorieMaterielRequest,
  CategorieMaterielResponseDTO
} from '../models/category-materiel.model';

@Injectable({ providedIn: 'root' })
export class CategorieMaterielService {

  private apiUrl = `${environment.apiUrl}/api/categories-materiel`;

  constructor(private http: HttpClient) {}

  // ── CRUD Operations ──────────────────────────────────────

  /**
   * Create new material category
   */
  addCategorie(request: CreateCategorieMaterielRequest): Observable<CategorieMaterielResponseDTO> {
    const payload = {
      nom: request.nom,
      description: request.description
    };
    console.log('Creating category with payload:', payload);
    return this.http.post<CategorieMaterielResponseDTO>(this.apiUrl, payload);
  }

  /**
   * Get all material categories
   */
  getAllCategories(): Observable<CategorieMateriel[]> {
    return this.http.get<CategorieMateriel[]>(this.apiUrl);
  }

  /**
   * Get category by ID
   */
  getCategorieById(id: number): Observable<CategorieMateriel> {
    return this.http.get<CategorieMateriel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update material category
   */
  updateCategorie(id: number, request: UpdateCategorieMaterielRequest): Observable<CategorieMaterielResponseDTO> {
    const payload = {
      nom: request.nom,
      description: request.description
    };
    console.log('Updating category with payload:', payload);
    return this.http.put<CategorieMaterielResponseDTO>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete material category
   */
  deleteCategorie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
