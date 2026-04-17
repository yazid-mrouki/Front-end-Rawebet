import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard protégeant la route /club/admin.
 * Accès autorisé si : SUPER_ADMIN OU permission 'CLUB_MANAGE'.
 * Redirige vers /auth/sign-in si non authentifié,
 * vers /club si authentifié mais sans les droits nécessaires.
 */
export const clubAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/sign-in']);
    return false;
  }

  if (auth.isSuperAdmin() || auth.hasPermission('CLUB_MANAGE')) {
    return true;
  }

  router.navigate(['/club']);
  return false;
};