import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EvenementService } from '../../features/event/services/evenement.service';
import { ReservationEvenementService } from '../../features/event/services/reservation-evenement.service';
import { UserService } from '../../core/services/user.service';
import { Evenement, EvenementStatus, TypeCategorie } from '../../features/event/models/evenement.model';
import { ReservationEvenement } from '../../features/event/models/reservation-evenement.model';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './events.component.html'
})
export class EventsComponent implements OnInit {
  categories = ['All', ...Object.values(TypeCategorie)];
  activeCategory = 'All';

  events: Evenement[] = [];
  isLoading = true;
  error = '';

  // My Reservations
  showMyReservations = false;
  userReservations: ReservationEvenement[] = [];
  isLoadingReservations = false;
  currentUserId: number | null = null;

  constructor(
    private evenementService: EvenementService,
    private reservationService: ReservationEvenementService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPublishedEvents();
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    this.userService.getMe().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading current user:', err);
      }
    });
  }

  loadPublishedEvents(): void {
    this.isLoading = true;
    this.error = '';
    console.log('Loading published events...');

    this.evenementService.getEvenementsByStatus(EvenementStatus.PUBLISHED).subscribe({
      next: (data) => {
        console.log('✓ Published events loaded:', data);
        setTimeout(() => {
          this.events = data;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          console.log('✓ UI updated - isLoading:', this.isLoading, 'events:', this.events.length);
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading published events:', err);
        setTimeout(() => {
          this.error = `Failed to load events: ${err.message || err.statusText || 'Unknown error'}`;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  toggleMyReservations(): void {
    this.showMyReservations = !this.showMyReservations;
    if (this.showMyReservations && this.currentUserId) {
      this.loadUserReservations();
    }
  }

  loadUserReservations(): void {
    if (!this.currentUserId) return;

    this.isLoadingReservations = true;
    this.reservationService.getByUser(this.currentUserId).subscribe({
      next: (reservations) => {
        setTimeout(() => {
          this.userReservations = reservations;
          this.isLoadingReservations = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading user reservations:', err);
        this.isLoadingReservations = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancelReservation(reservation: ReservationEvenement): void {
    if (!confirm(`Are you sure you want to cancel your reservation for ${reservation.evenementTitre}?`)) {
      return;
    }

    this.reservationService.annuler(reservation.id).subscribe({
      next: () => {
        // Reload reservations after cancellation
        this.loadUserReservations();
        alert('Reservation cancelled successfully');
      },
      error: (err) => {
        console.error('Error cancelling reservation:', err);
        alert('Failed to cancel reservation. Please try again.');
      }
    });
  }

  get filteredEvents() {
    if (this.activeCategory === 'All') {
      return this.events;
    }
    // Filter by actual categorie field
    return this.events.filter(e => e.categorie === this.activeCategory);
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  getCategoryIcon(categorie: string): string {
    switch (categorie) {
      case 'THEATRE': return '🎭';
      case 'DANSE': return '💃';
      case 'MUSIQUE': return '🎵';
      case 'EXPOSITION': return '🖼️';
      case 'CONFERENCE': return '🎤';
      case 'ATELIER': return '🛠️';
      case 'FESTIVAL': return '🎪';
      case 'CONCERT': return '🎸';
      case 'SPECTACLE': return '🎭';
      case 'AUTRE': return '🎉';
      default: return '📅';
    }
  }
}
