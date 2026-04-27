import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Abonnement,
  SubscribeResponse,
  SubscriptionDto,
  TimelineResponse,
  UserAbonnement
} from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAbonnements() {
    return this.http.get<UserAbonnement[]>(`${this.api}/api/abonnements/all`);
  }

  subscribe(userId: number, abonnementId: number) {
    return this.http.post<SubscribeResponse>(
      `${this.api}/api/abonnements/subscribe/${userId}/${abonnementId}`,
      {}
    );
  }

  getUserTimeline(userId: number) {
    return this.http.get<TimelineResponse>(`${this.api}/api/abonnements/users/${userId}/timeline`);
  }

  getUserSubscriptions(userId: number) {
    return this.http.get<SubscriptionDto[]>(`${this.api}/api/abonnements/users/${userId}/all`);
  }

  getUserAbonnements() {
    return this.http.get<UserAbonnement[]>(`${this.api}/api/abonnements/users`);
  }

  getUserSubscriptionsWithQR(userId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/api/abonnements/users/${userId}/all`);
  }

  getSubscriptionByUserId(userId: number) {
    return this.http.get<UserAbonnement>(`${this.api}/api/abonnements/users/${userId}`);
  }

  cleanupExpiredUserAbonnements() {
    return this.http.delete<number>(`${this.api}/api/abonnements/users/expired`);
  }

  deleteUserAbonnement(abonnementId: number) {
    return this.http.delete(`${this.api}/api/abonnements/subscriptions/${abonnementId}`);
  }
}
