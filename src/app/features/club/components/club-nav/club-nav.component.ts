import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-club-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './club-nav.component.html',
})
export class ClubNavComponent {
  /** Affiche l'onglet "My Reservations" (membres uniquement) */
  @Input() showReservations = false;

  /** Remplace "My Reservations" par "Admin" (admins uniquement) */
  @Input() isAdmin = false;
}