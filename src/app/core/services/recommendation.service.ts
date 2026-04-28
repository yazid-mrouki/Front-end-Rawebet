import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  MovieRecommendation,
  RecommendationApiResponse,
  RecommendationPayload,
} from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly apiUrl = environment.recommendationApiUrl;
  private readonly directUrl = environment.recommendationDirectUrl;

  constructor(private readonly http: HttpClient) {}

  getRecommendations(userId: number): Observable<MovieRecommendation[]> {
    return this.http.get<MovieRecommendation[]>(`${this.apiUrl}/reco/${userId}`);
  }

  getBestFeedbackRecommendation(userId: number): Observable<MovieRecommendation[]> {
    return this.http.get<MovieRecommendation[]>(`${this.apiUrl}/reco-feedback/${userId}`);
  }

  getHealth(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  recommend(payload: RecommendationPayload): Observable<RecommendationApiResponse> {
    return this.http.post<RecommendationApiResponse>(`${this.apiUrl}/recommend`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        if (!this.shouldRetryDirect(error)) {
          return throwError(() => error);
        }

        return this.http.post<RecommendationApiResponse>(`${this.directUrl}/recommend`, payload);
      })
    );
  }

  private shouldRetryDirect(error: HttpErrorResponse): boolean {
    if (error.status === 0) {
      return true;
    }

    const parsingError = typeof error.message === 'string' && error.message.includes('Unexpected token');
    const htmlBodyError = typeof error.error === 'string' && error.error.includes('<!DOCTYPE');

    return parsingError || htmlBodyError;
  }
}
