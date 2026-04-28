import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Seance, SeancePayload, SeanceResponse } from '../models/seance.model';

@Injectable({ providedIn: 'root' })
export class SeanceService {
  private readonly apiUrl = `${environment.apiUrl}/seances`;
  private readonly filmsApiUrl = `${environment.apiUrl}/api/films`;
  private readonly sallesApiUrl = `${environment.apiUrl}/api/salles-cinema`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Seance[]> {
    return this.http.get<Seance[]>(`${this.apiUrl}/all?_=${Date.now()}`);
  }

  create(data: SeancePayload): Observable<SeanceResponse> {
    return this.http.post<SeanceResponse>(`${this.apiUrl}/add`, data);
  }

  update(id: number, data: SeancePayload): Observable<SeanceResponse> {
    return this.http.put<SeanceResponse>(`${this.apiUrl}/update/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${id}`);
  }

  getFilmNames(): Observable<Array<{ id: number; title: string }>> {
    return this.http.get<Array<{ id: number; title: string }>>(`${this.filmsApiUrl}/names`);
  }

  getSalleNames(): Observable<Array<{ id: number; name: string }>> {
    return this.http.get<Array<{ id: number; name: string }>>(`${this.sallesApiUrl}/names`);
  }
}
