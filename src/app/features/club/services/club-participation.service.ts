import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClubParticipation } from '../models/club-participation.model';
import { ClubParticipationRequest } from '../models/club-participation-request.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClubParticipationService {

  private apiUrl = `${environment.apiUrl}/club/reservations`;

  constructor(private http: HttpClient) {}

  reserve(
    request: ClubParticipationRequest
  ): Observable<ClubParticipation>{

    return this.http.post<ClubParticipation>(
      this.apiUrl,
      request
    );

  }

  updateReservation(id: number, places: number): Observable<ClubParticipation> {
    return this.http.put<ClubParticipation>(
      `${this.apiUrl}/${id}?places=${places}`,
      {}
    );
  }

  cancel(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );

  }

  myReservations(): Observable<ClubParticipation[]>{

    return this.http.get<ClubParticipation[]>(
      `${this.apiUrl}/my`
    );

  }

}