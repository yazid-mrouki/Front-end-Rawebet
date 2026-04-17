import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubParticipation } from '../../models/club-participation.model';
import { ClubNavComponent } from '../../components/club-nav/club-nav.component';

@Component({
  selector: 'app-club-participations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClubNavComponent],
  templateUrl: './club-participations.component.html',
  styleUrls: ['./club-participations.component.scss']
})
export class ClubParticipationsComponent implements OnInit {

  reservations: ClubParticipation[] = [];
  loading = true;
  error: string | null = null;
  success: string | null = null;

  cancelTargetId: number | null = null;

  // Edit
  editTargetId: number | null = null;
  editPlaces = 1;
  editLoading = false;
  editError: string | null = null;
  editMaxPlaces = 0;

  constructor(
    private participationService: ClubParticipationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading = true;
    this.participationService.myReservations().subscribe({
      next: (data) => { this.reservations = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  get confirmedCount(): number {
    return this.reservations.filter(r => r.status === 'CONFIRMED').length;
  }

  confirmCancel(id: number): void { this.cancelTargetId = id; }
  abortCancel(): void { this.cancelTargetId = null; }

  confirmEdit(r: ClubParticipation): void {
    this.editTargetId = r.id;
    this.editPlaces = r.reservedPlaces;
    this.editMaxPlaces = r.remainingPlaces;
    this.editError = null;
  }
  abortEdit(): void {
    this.editTargetId = null;
    this.editPlaces = 1;
    this.editError = null;
  }

  private showSuccess(msg: string): void {
    this.success = msg;
    setTimeout(() => { this.success = null; }, 4000);
  }

  private showError(msg: string): void {
    this.error = msg;
    setTimeout(() => { this.error = null; }, 6000);
  }

  cancel(): void {
    if (this.cancelTargetId === null) return;
    const id = this.cancelTargetId;
    this.cancelTargetId = null;

    this.participationService.cancel(id).subscribe({
      next: () => {
        this.showSuccess('Reservation cancelled.');
        this.loadReservations();
      },
      error: (err) => {
        this.showError(err?.error?.error || 'Cancellation failed.');
        this.cdr.detectChanges();
      }
    });
  }

  updateReservation(): void {
    if (this.editTargetId === null || this.editPlaces < 1) return;
    this.editLoading = true;
    this.editError = null;

    this.participationService.updateReservation(this.editTargetId, this.editPlaces).subscribe({
      next: () => {
        this.editLoading = false;
        this.editTargetId = null;
        this.editError = null;
        this.showSuccess('Reservation updated successfully.');
        this.loadReservations();
      },
      error: (err) => {
        this.editLoading = false;
        this.editError = err?.error?.error || 'Not enough places available.';
        this.cdr.detectChanges();
      }
    });
  }
}