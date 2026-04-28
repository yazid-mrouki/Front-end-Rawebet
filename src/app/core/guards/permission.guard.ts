import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const permissionGuard = (permissions: string[]): CanActivateFn => {
  return () => {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return true;

    const auth = inject(AuthService);

    if (auth.hasAnyPermission(permissions)) return true;

    // Rediriger vers une page dédiée plutôt que /admin silencieusement
    inject(Router).navigate(['/admin/unauthorized']);
    return false;
  };
};
