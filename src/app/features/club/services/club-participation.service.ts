import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClubParticipation } from '../models/club-participation.model';
import { ClubParticipationRequest } from '../models/club-participation-request.model';

@Injectable({
  providedIn: 'root'
})
export class ClubParticipationService {

  private apiUrl = '/api/club/reservations';

  constructor(private http: HttpClient) {}

  reserve(
    request: ClubParticipationRequest
  ): Observable<ClubParticipation>{

    return this.http.post<ClubParticipation>(
      this.apiUrl,
      request
    );

  }

  cancel(id:number): Observable<void>{

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