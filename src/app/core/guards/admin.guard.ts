import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);

  // Si on est côté serveur (SSR), on laisse passer
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuth = auth.isAuthenticated();
  const isAdmin = auth.isAdmin();

  console.log('adminGuard — isAuthenticated:', isAuth, '— isAdmin:', isAdmin);

  if (isAuth && isAdmin) return true;

  router.navigate(['/home']);
  return false;
};
