import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-admin-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div class="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-4xl mb-6">
        🔒
      </div>
      <h1 class="font-serif text-2xl font-bold text-dark mb-2">Accès refusé</h1>
      <p class="text-gray-500 text-sm mb-8 max-w-sm">
        Vous n'avez pas les permissions nécessaires pour accéder à cette section. Contactez un Super
        Admin si vous pensez qu'il s'agit d'une erreur.
      </p>
      <a
        routerLink="/admin/dashboard"
        class="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors"
      >
        Retour au dashboard
      </a>
    </div>
  `,
})
export class AdminUnauthorizedComponent {}
