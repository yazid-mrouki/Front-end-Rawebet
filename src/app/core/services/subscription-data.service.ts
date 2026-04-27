import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserAbonnement } from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionDataService {
  private subscriptionSubject = new BehaviorSubject<UserAbonnement | null>(null);
  public subscription$ = this.subscriptionSubject.asObservable();

  setSubscription(sub: UserAbonnement | null) {
    this.subscriptionSubject.next(sub);
  }

  getSubscription(): UserAbonnement | null {
    return this.subscriptionSubject.value;
  }

  clearSubscription() {
    this.subscriptionSubject.next(null);
  }
}
