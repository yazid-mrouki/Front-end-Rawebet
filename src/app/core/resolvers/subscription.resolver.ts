import { Injectable } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthService } from '../services/auth.service';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionResolver {
  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private router: Router
  ) {}
}

export const subscriptionResolver: ResolveFn<any> = (route, state, subscriptionService: SubscriptionService = null as any, authService: AuthService = null as any) => {
  // Get from injector since we can't directly inject in ResolveFn
  const injector = (route as any).injector || {};

  return (route: any, state: any) => {
    const subscriptionService = route.injector?.get(SubscriptionService);
    const authService = route.injector?.get(AuthService);

    const userId = authService?.getUserId();

    if (!userId) {
      return of(null);
    }

    return subscriptionService.getSubscriptionByUserId(userId).pipe(
      catchError(error => {
        console.error('Error fetching subscription:', error);
        return of(null);
      })
    );
  };
};

// Simplified version using proper Angular dependency injection
export const createSubscriptionResolver = (
  subscriptionService: SubscriptionService,
  authService: AuthService
): ResolveFn<any> => {
  return () => {
    const userId = authService.getUserId();

    if (!userId) {
      return of(null);
    }

    return subscriptionService.getSubscriptionByUserId(userId).pipe(
      catchError(error => {
        console.error('Error fetching subscription:', error);
        return of(null);
      })
    );
  };
};
