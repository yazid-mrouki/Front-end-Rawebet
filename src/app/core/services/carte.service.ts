import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CarteFideliteResponse,
  FidelityHistoryResponse,
  RewardResponse,
  CarteStatsResponse,
  TopClientResponse,
  LoyaltyDashboardResponse,
  LoyaltyAdminOverviewResponse,
} from '../models/carte.model';

@Injectable({ providedIn: 'root' })
export class CarteService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMaCarte() {
    return this.http.get<CarteFideliteResponse>(`${this.api}/carte/me`);
  }

  getDashboard() {
    return this.http.get<LoyaltyDashboardResponse>(`${this.api}/carte/dashboard`);
  }

  getHistory() {
    return this.http.get<FidelityHistoryResponse[]>(`${this.api}/carte/history`);
  }

  getRewards() {
    return this.http.get<any[]>(`${this.api}/carte/rewards`);
  }

  redeemReward(reward: string) {
    return this.http.post<RewardResponse>(`${this.api}/carte/redeem?reward=${reward}`, {});
  }

  transferPoints(toUserId: number, points: number) {
    return this.http.post(
      `${this.api}/carte/transfer?toUserId=${toUserId}&points=${points}`,
      {},
      { responseType: 'text' },
    );
  }

  getAdminOverview() {
    return this.http.get<LoyaltyAdminOverviewResponse>(`${this.api}/carte/admin/overview`);
  }

  getStats() {
    return this.http.get<CarteStatsResponse>(`${this.api}/carte/admin/stats`);
  }

  getTop(limit?: number) {
    const q = limit ? `?limit=${limit}` : '';
    return this.http.get<TopClientResponse[]>(`${this.api}/carte/admin/top${q}`);
  }

  addPoints(userId: number, points: number) {
    return this.http.post(
      `${this.api}/carte/admin/add-points/${userId}?points=${points}`,
      {},
      { responseType: 'text' },
    );
  }
}
