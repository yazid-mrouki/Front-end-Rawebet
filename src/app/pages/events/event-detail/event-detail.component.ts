import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { EvenementService } from '../../../features/event/services/evenement.service';
import { ReservationEvenementService } from '../../../features/event/services/reservation-evenement.service';
import { UserService } from '../../../core/services/user.service';
import { Evenement } from '../../../features/event/models/evenement.model';
import { ReservationEvenementRequestDTO } from '../../../features/event/models/reservation-evenement.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit {
  event: Evenement | null = null;
  isLoading = true;
  error = '';

  // Phone number regex - accepts: +216XXXXXXXX, 216XXXXXXXX, +216 XX XXX XXX, or similar formats
  phoneNumberRegex = /^(?:\+216|216|0)?[0-9\s\-()]{8,}$/;

  // Reservation modal state
  showReservationModal = false;
  reservationForm!: FormGroup;
  isSubmittingReservation = false;
  reservationError = '';
  reservationSuccess = false;
  isWaitlist = false; // Track if user was added to waitlist
  userEmail = 'user@example.com'; // Default email, can be fetched from auth service
  currentUserId: number = 1; // Store the current user's ID

  constructor(
    private route: ActivatedRoute,
    private evenementService: EvenementService,
    private reservationService: ReservationEvenementService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    this.userService.getMe().subscribe({
      next: (user) => {
        console.log('✓ Current user loaded:', user);
        console.log('✓ User ID:', user.id, 'User nom:', user.nom, 'User email:', user.email);
        this.currentUserId = user.id; // Store the user ID
        this.userEmail = user.email;

        // Wait for form to be initialized, then update with real user data
        setTimeout(() => {
          if (this.reservationForm) {
            // First enable the fields to update values
            this.reservationForm.get('nom')?.enable();
            this.reservationForm.get('email')?.enable();

            // Then patch the values
            this.reservationForm.patchValue({
              nom: user.nom || '',
              email: user.email || ''
            });

            console.log('✓ Form updated with user data - nom:', user.nom, 'email:', user.email);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }
        }, 100);
      },
      error: (err) => {
        console.error('✗ Error loading current user:', err);
        // Keep default values if user fetch fails
      }
    });
  }

  initializeForm(): void {
    this.reservationForm = new FormGroup({
      nom: new FormControl(''),
      email: new FormControl(this.userEmail),
      phoneNumber: new FormControl('', [
        Validators.required,
        Validators.pattern(this.phoneNumberRegex)
      ])
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadEvent(id);
      }
    });
  }

  loadEvent(id: number): void {
    this.isLoading = true;
    this.error = '';
    console.log('Loading event details for ID:', id);

    this.evenementService.getEvenementById(id).subscribe({
      next: (data) => {
        console.log('✓ Event loaded:', data);
        setTimeout(() => {
          this.event = data;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          console.log('✓ Event detail UI updated');
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading event:', err);
        setTimeout(() => {
          this.error = 'Failed to load event details';
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  getCategoryIcon(categorie: string): string {
    switch (categorie) {
      case 'THEATRE': return '🎭';
      case 'DANSE': return '💃';
      case 'MUSIQUE': return '🎵';
      case 'EXPOSITION': return '🖼️';
      case 'CONFERENCE': return '🎤';
      case 'ATELIER': return '🔧';
      case 'FESTIVAL': return '🎪';
      case 'CONCERT': return '🎸';
      case 'SPECTACLE': return '🎭';
      case 'AUTRE': return '🎉';
      default: return '📅';
    }
  }

  goBack(): void {
    window.history.back();
  }

  reserve(): void {
    if (this.event) {
      // Ensure form is initialized and reset
      if (!this.reservationForm) {
        this.initializeForm();
      }
      this.resetReservationForm();
      // Disable the read-only fields
      this.reservationForm.get('nom')?.disable();
      this.reservationForm.get('email')?.disable();
      this.showReservationModal = true;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  closeReservationModal(): void {
    this.showReservationModal = false;
    this.resetReservationForm();
  }

  resetReservationForm(): void {
    // Enable fields temporarily to set values
    this.reservationForm.get('nom')?.enable();
    this.reservationForm.get('email')?.enable();

    // Get current values (they should be populated by loadCurrentUser)
    const currentNom = this.reservationForm.get('nom')?.value || '';
    const currentEmail = this.reservationForm.get('email')?.value || this.userEmail;

    // Reset only the phone number, keep name and email
    this.reservationForm.patchValue({
      nom: currentNom,
      email: currentEmail,
      phoneNumber: ''
    });
    this.reservationError = '';
    this.reservationSuccess = false;
    this.isWaitlist = false; // Reset waitlist flag
    this.cdr.markForCheck();
  }

  submitReservation(): void {
    if (!this.event) {
      this.reservationError = 'Event not found';
      return;
    }

    if (!this.reservationForm.valid) {
      const phoneControl = this.reservationForm.get('phoneNumber');
      if (phoneControl?.hasError('required')) {
        this.reservationError = 'Phone number is required';
      } else if (phoneControl?.hasError('pattern')) {
        this.reservationError = 'Please enter a valid phone number (e.g., +216 XX XXX XXX or 216XXXXXXXX)';
      } else {
        this.reservationError = 'Please fill in all required fields correctly';
      }
      return;
    }

    const phoneNumber = this.reservationForm.get('phoneNumber')?.value;
    if (!phoneNumber || !phoneNumber.trim()) {
      this.reservationError = 'Phone number is required';
      return;
    }

    this.isSubmittingReservation = true;
    this.reservationError = '';

    // Use the actual logged-in user's ID
    const reservationDto: ReservationEvenementRequestDTO = {
      userId: this.currentUserId,
      evenementId: this.event.id,
      phoneNumber: phoneNumber.trim()
    };

    this.reservationService.reserver(reservationDto).subscribe({
      next: (reservation) => {
        setTimeout(() => {
          // Check if the reservation is on waitlist
          this.isWaitlist = reservation.enAttente || false;
          this.reservationSuccess = true;
          this.isSubmittingReservation = false;
          console.log('✓ Reservation created - Waitlist:', this.isWaitlist, 'Status:', reservation.statut);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          // Close modal after 3 seconds (longer for waitlist message)
          setTimeout(() => {
            this.closeReservationModal();
          }, 3000);
        }, 0);
      },
      error: (err) => {
        setTimeout(() => {
          // Try multiple possible error response formats
          let errorMessage = 'Failed to make reservation';

          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.error?.error) {
            errorMessage = err.error.error;
          } else if (err.error?.detail) {
            errorMessage = err.error.detail;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.message) {
            errorMessage = err.message;
          }

          // Translate French error messages to English
          errorMessage = this.translateErrorMessage(errorMessage);

          console.error('Reservation error:', err);
          this.reservationError = errorMessage;
          this.isSubmittingReservation = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  private translateErrorMessage(message: string): string {
    const translations: { [key: string]: string } = {
      'Vous avez déjà une réservation pour cet événement': 'You already have a reservation for this event',
      'Le numéro de téléphone est obligatoire': 'Phone number is required',
      'Numéro de téléphone invalide': 'Invalid phone number',
      'Événement non trouvé': 'Event not found',
      'Utilisateur non trouvé': 'User not found',
      'Plus de places disponibles': 'No more available spots',
      'Réservation échouée': 'Reservation failed'
    };

    return translations[message] || message;
  }
}
