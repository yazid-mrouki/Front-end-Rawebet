import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateFeedbackRequest, FeedbackResponse, UpdateFeedbackRequest } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly apiUrl = `${environment.apiUrl}/feedbacks`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<FeedbackResponse[]> {
    return this.http.get<FeedbackResponse[]>(`${this.apiUrl}/all`);
  }

  getMine(): Observable<FeedbackResponse[]> {
    return this.http.get<FeedbackResponse[]>(`${this.apiUrl}/my`);
  }

  add(request: CreateFeedbackRequest): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(`${this.apiUrl}/add`, request);
  }

  update(request: UpdateFeedbackRequest): Observable<FeedbackResponse> {
    return this.http.put<FeedbackResponse>(`${this.apiUrl}/update`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${id}`);
  }
}
