import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Club } from '../models/club.model';
import { environment } from '../../../../environments/environment';

export interface ClubUpdatePayload {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClubService {

  private apiUrl = `${environment.apiUrl}/club`;

  constructor(private http: HttpClient) {}

  getClub(): Observable<Club> {
    return this.http.get<Club>(this.apiUrl);
  }

  // Envoie uniquement name + description (correspond au ClubRequestDTO backend)
  updateClub(payload: ClubUpdatePayload): Observable<Club> {
    return this.http.put<Club>(this.apiUrl, payload);
  }
}