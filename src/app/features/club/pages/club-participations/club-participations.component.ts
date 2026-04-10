import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubParticipation } from '../../models/club-participation.model';

@Component({
  selector: 'app-club-participations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './club-participations.component.html',
  styleUrls: ['./club-participations.component.scss']
})
export class ClubParticipationsComponent implements OnInit {

  reservations: ClubParticipation[] = [];
  loading = true;
  error: string | null = null;
  success: string | null = null;

  // Id de la réservation en cours d'annulation (confirmation)
  cancelTargetId: number | null = null;

  constructor(private participationService: ClubParticipationService) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading = true;
    this.participationService.myReservations().subscribe({
      next: (data) => {
        this.reservations = data;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get confirmedCount(): number {
    return this.reservations.filter(r => r.status === 'CONFIRMED').length;
  }

  confirmCancel(id: number): void {
    this.cancelTargetId = id;
  }

  abortCancel(): void {
    this.cancelTargetId = null;
  }

  cancel(): void {
    if (this.cancelTargetId === null) return;
    const id = this.cancelTargetId;
    this.cancelTargetId = null;
    this.error = null;

    this.participationService.cancel(id).subscribe({
      next: () => {
        this.success = 'Reservation cancelled.';
        this.loadReservations();
      },
      error: (err) => {
        this.error = err?.error?.error || 'Cancellation failed.';
      }
    });
  }
}