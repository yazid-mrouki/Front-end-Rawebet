import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClubJoinRequest } from '../models/club-join-request.model';
import { ClubJoinRequestPayload } from '../models/club-join-request-payload.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClubJoinRequestService {

  private apiUrl = `${environment.apiUrl}/club/requests`;

  constructor(private http: HttpClient) {}

  submitRequest(payload: ClubJoinRequestPayload): Observable<ClubJoinRequest> {
    return this.http.post<ClubJoinRequest>(this.apiUrl, payload);
  }

  /** Récupère la demande de l'utilisateur connecté (PENDING, APPROVED ou REJECTED) */
  getMyRequest(): Observable<ClubJoinRequest> {
    return this.http.get<ClubJoinRequest>(`${this.apiUrl}/my`);
  }

  getPendingRequests(): Observable<ClubJoinRequest[]> {
    return this.http.get<ClubJoinRequest[]>(`${this.apiUrl}/pending`);
  }

  approve(id: number): Observable<ClubJoinRequest> {
    return this.http.put<ClubJoinRequest>(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: number): Observable<ClubJoinRequest> {
    return this.http.put<ClubJoinRequest>(`${this.apiUrl}/${id}/reject`, {});
  }
}