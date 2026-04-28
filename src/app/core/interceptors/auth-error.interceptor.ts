import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GuestPreviewService } from '../services/guest-preview.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const guest = inject(GuestPreviewService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/logout');

      // Mode visiteur anonyme → ignorer tous les 401/403
      // Les appels API sans token retournent 403 normalement — c'est attendu
      if (guest.isGuestPreview()) {
        return throwError(() => err);
      }

      // 401 — token expiré ou invalide → déconnexion + redirect login
      if (err.status === 401 && !isAuthRequest && auth.isAuthenticated()) {
        auth.handleUnauthorized();
      }

      // 403 — permission refusée → redirect vers page d'accueil admin
      // Uniquement si authentifié et pas en mode visiteur
      if (err.status === 403 && auth.isAuthenticated()) {
        router.navigate(['/admin']);
      }

      return throwError(() => err);
    }),
  );
};
