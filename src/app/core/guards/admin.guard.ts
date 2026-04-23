import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ImpersonationService } from '../services/impersonation.service';
import { isPlatformBrowser } from '@angular/common';

/**
 * adminGuard — vérifie :
 * 1. Connecté
 * 2. Rôle admin (SUPER_ADMIN | ADMIN_CINEMA | ADMIN_EVENT | ADMIN_CLUB)
 * 3. PAS en mode client (impersonation) → si oui, rediriger /home
 *
 * Ce guard protège tout l'espace /admin/*.
 * Un admin en mode client ne peut PAS accéder à /admin — exactement comme un vrai client.
 */
export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  const impersonation = inject(ImpersonationService);
  const router = inject(Router);

  // Pas connecté → login
  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/sign-in']);
    return false;
  }

  // En mode client (impersonation active) → interdire /admin, rediriger /home
  // C'est LE guard qui garantit l'isolation du mode client
  if (impersonation.isImpersonating()) {
    router.navigate(['/home']);
    return false;
  }

  // Connecté mais pas admin → home
  if (!auth.isAdmin()) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
