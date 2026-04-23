import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { GuestPreviewService } from '../services/guest-preview.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const guest = inject(GuestPreviewService);

  // Mode visiteur anonyme → aucun token
  if (guest.isGuestPreview()) {
    return next(req.clone({ withCredentials: false }));
  }

  // Mode normal ou mode client :
  // AuthService.getToken() retourne automatiquement le bon token
  // (impersonation si actif, sinon token localStorage)
  const token = auth.getToken();
  const isAuthRequest =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  const headers = token && !isAuthRequest ? { Authorization: `Bearer ${token}` } : undefined;

  return next(req.clone({ withCredentials: true, setHeaders: headers }));
};
