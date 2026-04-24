import { Injectable } from '@angular/core';

/**
 * GuestPreviewService
 * Permet à un admin de visualiser le site public comme un visiteur anonyme.
 * Ouvre un nouvel onglet avec ?guest=true dans l'URL.
 * Le JwtInterceptor détecte ce flag et n'envoie pas de token.
 * La Navbar détecte ce flag et affiche une bannière "Mode visiteur".
 */
@Injectable({ providedIn: 'root' })
export class GuestPreviewService {
  /** Clé stockée en sessionStorage UNIQUEMENT pour l'onglet guest */
  private readonly GUEST_KEY = 'rawabet_guest_preview';

  /**
   * Ouvre le site dans un nouvel onglet sans JWT.
   * On passe ?guest=true à l'URL — le composant app.ts lit ce param
   * au démarrage et active le mode guest pour CET onglet seulement.
   */
  openGuestPreview(path = '/home') {
    const url = `${window.location.origin}${path}?guest=true`;
    window.open(url, '_blank', 'noopener');
  }

  /**
   * Appelé au démarrage de l'app (dans app.ts).
   * Si ?guest=true est dans l'URL, active le mode guest pour cet onglet
   * et retire le param de l'URL pour ne pas le propager.
   */
  initFromUrl(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('guest') === 'true') {
      sessionStorage.setItem(this.GUEST_KEY, 'true');
      // Retire le ?guest=true de l'URL sans recharger
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      return true;
    }
    return false;
  }

  /** true si cet onglet est en mode visiteur */
  isGuestPreview(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(this.GUEST_KEY) === 'true';
  }

  /** Quitte le mode visiteur (ex: si l'utilisateur clique "Quitter le mode visiteur") */
  exitGuestPreview() {
    sessionStorage.removeItem(this.GUEST_KEY);
    window.location.href = '/home';
  }
}
