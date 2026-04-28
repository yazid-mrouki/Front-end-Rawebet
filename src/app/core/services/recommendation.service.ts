import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovieRecommendation } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly apiUrl = environment.recommendationApiUrl;

  constructor(private readonly http: HttpClient) {}

  getRecommendations(userId: number): Observable<MovieRecommendation[]> {
    return this.http.get<MovieRecommendation[]>(`${this.apiUrl}/reco/${userId}`);
  }

  getBestFeedbackRecommendation(userId: number): Observable<MovieRecommendation[]> {
    return this.http.get<MovieRecommendation[]>(`${this.apiUrl}/reco-feedback/${userId}`);
  }
}
