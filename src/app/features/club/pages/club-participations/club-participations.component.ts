import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubParticipation } from '../../models/club-participation.model';
import { ClubNavComponent } from '../../components/club-nav/club-nav.component';

@Component({
  selector: 'app-club-participations',
  standalone: true,
  imports: [CommonModule, RouterModule, ClubNavComponent],
  templateUrl: './club-participations.component.html',
  styleUrls: ['./club-participations.component.scss']
})
export class ClubParticipationsComponent implements OnInit {

  reservations: ClubParticipation[] = [];
  loading = true;
  error: string | null = null;
  success: string | null = null;

  cancelTargetId: number | null = null;

  constructor(private participationService: ClubParticipationService, private cdr: ChangeDetectorRef) {}

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

  // ── Alertes auto-dismiss ───────────────────────────────────

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
      }
    });
  }
}