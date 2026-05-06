import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaterielService } from '../../../features/material/services/materiel.service';
import { ReservationMaterielService } from '../../../features/material/services/reservation-materiel.service';
import { AuthService } from '../../../core/services/auth.service';
import { Materiel } from '../../../features/material/models/materiel.model';

@Component({
  selector: 'app-material-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './material-detail.component.html',
  styleUrl: './material-detail.component.scss'
})
export class MaterialDetailComponent implements OnInit {
  material: Materiel | null = null;
  isLoading = true;
  error = '';
  materialId: number | null = null;

  // Reservation modal
  showReservationModal = false;
  reservationQuantity = 1;
  reservationStartDate = '';
  reservationEndDate = '';
  isSubmittingReservation = false;
  reservationError = '';
  reservationSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private materielService: MaterielService,
    private reservationService: ReservationMaterielService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.getCurrentUserId()) {
      this.error = 'You must be logged in to reserve materials.';
      this.isLoading = false;
      return;
    }

    this.route.paramMap.subscribe({
      next: (params) => {
        const id = params.get('id');
        if (id && !isNaN(+id)) {
          this.materialId = +id;
          this.loadMaterial(this.materialId);
        } else {
          this.error = 'Invalid material ID';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      }
    });
  }

  loadMaterial(id: number): void {
    this.isLoading = true;
    this.error = '';
    console.log(`Loading material ${id}...`);

    this.materielService.getMaterielById(id).subscribe({
      next: (data) => {
        console.log('✓ Material loaded:', data);
        // Only show ACTIVE materials
        if (data.status !== 'ACTIVE') {
          this.error = 'This material is not currently available.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }
        setTimeout(() => {
          this.material = data;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading material:', err);
        setTimeout(() => {
          this.error = `Failed to load material: ${err.message || err.statusText || 'Unknown error'}`;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/materials']);
  }

  openReservationModal(): void {
    // Reset form
    this.reservationQuantity = 1;
    this.reservationStartDate = '';
    this.reservationEndDate = '';
    this.reservationError = '';
    this.reservationSuccess = false;
    this.showReservationModal = true;
    this.cdr.markForCheck();
  }

  closeReservationModal(): void {
    this.showReservationModal = false;
    this.cdr.markForCheck();
  }

  submitReservation(): void {
    // Validation
    if (!this.reservationStartDate || !this.reservationEndDate) {
      this.reservationError = 'Please select both start and end dates.';
      return;
    }

    if (this.reservationQuantity < 1) {
      this.reservationError = 'Quantity must be at least 1.';
      return;
    }

    if (new Date(this.reservationStartDate) >= new Date(this.reservationEndDate)) {
      this.reservationError = 'End date must be after start date.';
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId || !this.materialId) {
      this.reservationError = 'Missing user or material information.';
      return;
    }

    this.isSubmittingReservation = true;
    this.reservationError = '';

    const reservationRequest = {
      userId,
      materielId: this.materialId,
      quantite: this.reservationQuantity,
      dateDebut: new Date(this.reservationStartDate).toISOString(),
      dateFin: new Date(this.reservationEndDate).toISOString()
    };

    console.log('Submitting reservation:', reservationRequest);

    this.reservationService.reserver(reservationRequest).subscribe({
      next: (response) => {
        console.log('✓ Reservation successful:', response);
        this.isSubmittingReservation = false;
        this.reservationSuccess = true;
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeReservationModal();
          // Navigate to materials-reservations page
          this.router.navigate(['/materials-reservations']);
        }, 2000);
      },
      error: (err) => {
        console.error('✗ Reservation error:', err);
        this.isSubmittingReservation = false;
        this.reservationError =
          err?.error?.message ||
          err?.error?.error ||
          err?.message ||
          'Failed to create reservation. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  makeReservation(): void {
    this.openReservationModal();
  }
}
