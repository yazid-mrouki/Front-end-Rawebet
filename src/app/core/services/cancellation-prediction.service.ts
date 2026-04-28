import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CancellationPredictionBatchRequest,
  CancellationPredictionBatchResponse,
} from '../models/cancellation-prediction.model';

@Injectable({ providedIn: 'root' })
export class CancellationPredictionService {
  private readonly apiUrl = environment.cancellationPredictionApiUrl;

  constructor(private readonly http: HttpClient) {}

  predictBatch(payload: CancellationPredictionBatchRequest): Observable<CancellationPredictionBatchResponse> {
    return this.http.post<CancellationPredictionBatchResponse>(`${this.apiUrl}/predictions/batch`, payload);
  }
}
