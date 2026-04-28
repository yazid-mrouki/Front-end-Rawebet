import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { RecommendationApiResponse, RecommendationPayload } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private baseUrl = environment.recommendationApiUrl;
  private directUrl = environment.recommendationDirectUrl;

  constructor(private http: HttpClient) {}

  getHealth(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  recommend(payload: RecommendationPayload): Observable<RecommendationApiResponse> {
    return this.http.post<RecommendationApiResponse>(`${this.baseUrl}/recommend`, payload).pipe(
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
