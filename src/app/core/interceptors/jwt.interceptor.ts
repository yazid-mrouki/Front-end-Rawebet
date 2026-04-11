import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {

  // ← Ne pas toucher les requêtes TMDB
  if (req.url.includes('api.themoviedb.org')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getToken();
  const isAuthRequest =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  const headers = token && !isAuthRequest
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  req = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  return next(req);
};