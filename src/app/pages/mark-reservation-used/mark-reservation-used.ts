import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize, take } from 'rxjs';
import { ReservationEvenementService } from '../../features/event/services/reservation-evenement.service';

@Component({
  selector: 'app-mark-reservation-used',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-primary-light">
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">

        <!-- Loading -->
        <div *ngIf="loading" class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p class="text-gray-600">Processing your reservation...</p>
        </div>

        <!-- Success -->
        <div *ngIf="!loading && success" class="text-center">
          <div class="text-5xl mb-4">✅</div>
          <h1 class="text-2xl font-bold text-dark mb-2">Success!</h1>
          <p class="text-gray-600 mb-6">
            Your reservation has been marked as <strong>Already Used</strong>
          </p>

          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-green-700">
              <strong>Reservation ID:</strong> {{ reservationId }}
            </p>
            <p class="text-sm text-green-700 mt-2">
              <strong>Status:</strong> Already Used
            </p>
          </div>

          <button
            (click)="goBack()"
            class="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors"
          >
            Back to Admin
          </button>
        </div>

        <!-- Error -->
        <div *ngIf="!loading && error" class="text-center">
          <div class="text-5xl mb-4">❌</div>
          <h1 class="text-2xl font-bold text-red-600 mb-2">Error</h1>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <button
            (click)="goBack()"
            class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
          >
            Go Back
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class MarkReservationUsedComponent implements OnInit {
  loading = true;
  success = false;
  error = false;
  errorMessage = '';
  reservationId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationEvenementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(take(1)).subscribe({
      next: (params) => {
        const id = params.get('id');

        if (!id || isNaN(+id)) {
          this.loading = false;
          this.error = true;
          this.errorMessage = 'Invalid reservation ID';
          this.cdr.markForCheck();
          return;
        }

        this.reservationId = +id;
        this.markAsUsed(this.reservationId);
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.errorMessage = 'Failed to read reservation ID from URL';
        this.cdr.markForCheck();
      }
    });
  }

  markAsUsed(reservationId: number): void {
    console.log('🔄 Marking reservation as used:', reservationId);

    this.reservationService
      .markAsAlreadyUsed(reservationId)
      .pipe(
        take(1),
        finalize(() => {
          console.log('✓ API call finalized');
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          console.log('✅ Reservation marked successfully');
          this.success = true;
          this.error = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ Error marking reservation:', err);
          console.error('Error status:', err?.status);
          console.error('Error body:', err?.error);
          this.success = false;
          this.error = true;

          // Try to extract error message from various formats
          let message = err?.error?.message ||
                       err?.error?.error ||
                       err?.message ||
                       'Failed to mark reservation as used.';

          // Add status code if available
          if (err?.status === 400) {
            message += ' (The reservation may already be marked as used or invalid.)';
          } else if (err?.status) {
            message += ` (Error ${err.status})`;
          }

          this.errorMessage = message;
          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/events']);
  }
}

