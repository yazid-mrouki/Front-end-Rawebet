import { inject, PLATFORM_ID } from '@angular/core';
import {
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * authGuard — vérifie simplement que l'utilisateur est connecté.
 * En mode impersonation le token d'impersonation est valide → guard passe.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;

  inject(Router).navigate(['/auth/sign-in'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
