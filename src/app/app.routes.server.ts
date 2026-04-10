import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Routes auth : prerender statique OK
  { path: 'auth/sign-in',        renderMode: RenderMode.Prerender },
  { path: 'auth/sign-up',        renderMode: RenderMode.Prerender },
  { path: 'auth/forgot-password',renderMode: RenderMode.Prerender },
  { path: 'auth/reset-password', renderMode: RenderMode.Prerender },
  { path: 'home',                renderMode: RenderMode.Prerender },

  // Toutes les routes dynamiques (données API, auth requise) → CSR uniquement
  { path: '**', renderMode: RenderMode.Client }
];