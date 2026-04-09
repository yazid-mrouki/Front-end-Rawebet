import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Club } from '../models/club.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClubService {

  private apiUrl = `${environment.apiUrl}/club`;

  constructor(private http: HttpClient) {}

  getClub(): Observable<Club> {

    return this.http.get<Club>(this.apiUrl);

  }

  updateClub(club: Club): Observable<Club> {

    return this.http.put<Club>(this.apiUrl, club);

  }

}