import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClubEvent } from '../models/club-event.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClubEventService {

  private apiUrl = `${environment.apiUrl}/club/events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<ClubEvent[]> {

    return this.http.get<ClubEvent[]>(this.apiUrl);

  }

  getEvent(id: number): Observable<ClubEvent> {

    return this.http.get<ClubEvent>(`${this.apiUrl}/${id}`);

  }

  createEvent(event: any): Observable<ClubEvent>{

    return this.http.post<ClubEvent>(this.apiUrl,event);

  }

}