import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateFeedbackRequest,
  FeedbackMutationResult,
  FeedbackResponse,
  UpdateFeedbackRequest,
} from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly apiUrl = `${environment.apiUrl}/feedbacks`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<FeedbackResponse[]> {
    return this.http.get<FeedbackResponse[]>(`${this.apiUrl}/all?_=${Date.now()}`);
  }

  getMine(): Observable<FeedbackResponse[]> {
    return this.http.get<FeedbackResponse[]>(`${this.apiUrl}/my?_=${Date.now()}`);
  }

  add(request: CreateFeedbackRequest): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(`${this.apiUrl}/add`, request);
  }

  addWithModeration(request: CreateFeedbackRequest): Observable<FeedbackMutationResult> {
    return this.http
      .post<unknown>(`${this.apiUrl}/moderate`, request)
      .pipe(map((response) => this.normalizeMutationResponse(response, 'Feedback added successfully.')));
  }

  update(request: UpdateFeedbackRequest): Observable<FeedbackResponse> {
    return this.http.put<FeedbackResponse>(`${this.apiUrl}/update`, request);
  }

  updateWithModeration(request: UpdateFeedbackRequest): Observable<FeedbackMutationResult> {
    return this.http
      .put<unknown>(`${this.apiUrl}/update`, request)
      .pipe(map((response) => this.normalizeMutationResponse(response, 'Feedback updated successfully.')));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${id}`);
  }

  private normalizeMutationResponse(
    response: unknown,
    fallbackMessage: string,
  ): FeedbackMutationResult {
    const payload = (response ?? {}) as any;
    const nestedFeedback = payload.feedback ?? payload.data ?? payload.result ?? null;
    const directFeedback = this.isFeedbackResponse(payload) ? payload : null;
    const feedback = this.isFeedbackResponse(nestedFeedback) ? nestedFeedback : directFeedback;
    const success = typeof payload.success === 'boolean' ? payload.success : true;
    const containsBadWords = Boolean(payload.containsBadWords ?? payload.badWordsDetected ?? false);
    const message = String(payload.message || payload.msg || fallbackMessage);

    return {
      success,
      message,
      containsBadWords,
      feedback,
    };
  }

  private isFeedbackResponse(payload: any): payload is FeedbackResponse {
    return payload
      && typeof payload === 'object'
      && 'commentaire' in payload
      && 'note' in payload
      && 'filmId' in payload;
  }
}
