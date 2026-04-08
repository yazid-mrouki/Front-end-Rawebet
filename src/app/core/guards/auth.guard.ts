import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  inject(Router).navigate(['/auth/sign-in'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
