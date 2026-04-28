import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SeanceResponse } from '../models/seance.model';

@Injectable({ providedIn: 'root' })
export class SeanceService {
  private readonly apiUrl = `${environment.apiUrl}/seances`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<SeanceResponse[]> {
    return this.http.get<SeanceResponse[]>(`${this.apiUrl}/all`);
  }
}
