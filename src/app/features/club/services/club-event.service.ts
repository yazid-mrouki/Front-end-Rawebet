import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClubEvent } from '../models/club-event.model';
import { ClubEventDetail } from '../models/club-event-detail.model';
import { environment } from '../../../../environments/environment';

export interface ClubEventPayload {
  title: string;
  description: string;
  eventDate: string;
  maxPlaces: number;
  posterUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ClubEventService {

  private apiUrl = `${environment.apiUrl}/club/events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<ClubEvent[]> {
    return this.http.get<ClubEvent[]>(this.apiUrl);
  }

  getEvent(id: number): Observable<ClubEvent> {
    return this.http.get<ClubEvent>(`${this.apiUrl}/${id}`);
  }

  getEventDetail(id: number): Observable<ClubEventDetail> {
    return this.http.get<ClubEventDetail>(`${this.apiUrl}/${id}/detail`);
  }

  createEvent(event: ClubEventPayload): Observable<ClubEvent> {
    return this.http.post<ClubEvent>(this.apiUrl, event);
  }

  updateEvent(id: number, event: ClubEventPayload): Observable<ClubEvent> {
    return this.http.put<ClubEvent>(`${this.apiUrl}/${id}`, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}