import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CarteFideliteResponse, FidelityHistoryResponse, RewardResponse, CarteStatsResponse, TopClientResponse } from '../models/carte.model';

@Injectable({ providedIn: 'root' })
export class CarteService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMaCarte() { return this.http.get<CarteFideliteResponse>(`${this.api}/carte/me`); }

  getHistory() { return this.http.get<FidelityHistoryResponse[]>(`${this.api}/carte/history`); }

  getRewards() { return this.http.get<any[]>(`${this.api}/carte/rewards`); }

  redeemReward(reward: string) {
    return this.http.post<RewardResponse>(`${this.api}/carte/redeem?reward=${reward}`, {});
  }

  transferPoints(toUserId: number, points: number) {
    return this.http.post<void>(`${this.api}/carte/transfer?toUserId=${toUserId}&points=${points}`, {});
  }

  getStats() { return this.http.get<CarteStatsResponse>(`${this.api}/carte/admin/stats`); }

  getTop() { return this.http.get<TopClientResponse[]>(`${this.api}/carte/admin/top`); }

  addPoints(userId: number, points: number) {
    return this.http.post<void>(`${this.api}/carte/admin/add-points/${userId}?points=${points}`, {});
  }
}
