import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClubEventService } from '../../services/club-event.service';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubMemberService } from '../../services/club-member.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClubEvent } from '../../models/club-event.model';
import { ClubParticipation } from '../../models/club-participation.model';
import { ClubMember } from '../../models/club-member.model';
import { ClubNavComponent } from '../../components/club-nav/club-nav.component';

type EventFilter = 'upcoming' | 'past';

@Component({
  selector: 'app-club-events',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClubNavComponent],
  templateUrl: './club-events.component.html',
  styleUrls: ['./club-events.component.scss']
})
export class ClubEventsComponent implements OnInit {

  events: ClubEvent[] = [];
  reservations: ClubParticipation[] = [];
  myMembership: ClubMember | null = null;

  loading = true;
  error: string | null = null;
  success: string | null = null;

  filter: EventFilter = 'upcoming';

  places: { [key: number]: number } = {};
  eventErrors: { [key: number]: string } = {};

  constructor(
    private eventService: ClubEventService,
    private participationService: ClubParticipationService,
    private memberService: ClubMemberService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isClubAdmin(): boolean {
    return this.auth.isSuperAdmin() || this.auth.hasPermission('CLUB_MANAGE');
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.error = null;
    this.success = null;
    this.loadEvents();
    this.loadReservations();
    this.loadMembership();
  }

  loadEvents(): void {
    this.loading = true;
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.loading = false;
        data.forEach(e => {
          if (!this.places[e.id]) this.places[e.id] = 1;
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.showError('Failed to load events');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadReservations(): void {
    if (!this.auth.isAuthenticated() || this.isClubAdmin) {
      this.reservations = [];
      return;
    }
    this.participationService.myReservations().subscribe({
      next: (data) => { this.reservations = data; this.cdr.detectChanges(); },
      error: () => { this.reservations = []; }
    });
  }

  loadMembership(): void {
    if (!this.auth.isAuthenticated() || this.isClubAdmin) {
      this.myMembership = null;
      return;
    }
    this.memberService.getMyMembership().subscribe({
      next: (data) => { this.myMembership = data; this.cdr.detectChanges(); },
      error: () => { this.myMembership = null; }
    });
  }

  // ── Filtre upcoming / past ─────────────────────────────────

  get filteredEvents(): ClubEvent[] {
    const now = new Date();
    if (this.filter === 'upcoming') {
      return this.events.filter(e => new Date(e.eventDate) >= now);
    }
    return this.events.filter(e => new Date(e.eventDate) < now);
  }

  get upcomingCount(): number {
    return this.events.filter(e => new Date(e.eventDate) >= new Date()).length;
  }

  get pastCount(): number {
    return this.events.filter(e => new Date(e.eventDate) < new Date()).length;
  }

  setFilter(f: EventFilter): void {
    this.filter = f;
  }

  // ── Alertes auto-dismiss ───────────────────────────────────

  private showSuccess(msg: string): void {
    this.success = msg;
    setTimeout(() => { this.success = null; }, 4000);
  }

  private showError(msg: string): void {
    this.error = msg;
    setTimeout(() => { this.error = null; }, 6000);
  }

  // ── Confirmation réservation ──────────────────────────────
  confirmTargetId: number | null = null;
  confirmPlaces = 1;

  askConfirmReserve(eventId: number, remainingPlaces: number): void {
    const p = this.places[eventId] || 1;
    this.eventErrors[eventId] = '';
    if (p < 1) {
      this.eventErrors[eventId] = 'Please select at least 1 place.';
      return;
    }
    if (p > remainingPlaces) {
      this.eventErrors[eventId] = `Only ${remainingPlaces} spot(s) available.`;
      return;
    }
    this.confirmTargetId = eventId;
    this.confirmPlaces = p;
  }

  abortReserve(): void {
    this.confirmTargetId = null;
  }

  confirmReserve(): void {
    if (this.confirmTargetId === null) return;
    const id = this.confirmTargetId;
    this.confirmTargetId = null;
    this.reserve(id);
  }

  // ── Réservation ───────────────────────────────────────────

  alreadyReserved(eventId: number): boolean {
    return this.reservations.some(r => r.eventId === eventId && r.status === 'CONFIRMED');
  }

  reserve(eventId: number): void {
    if (!this.myMembership) {
      this.showError('You must join the club before reserving.');
      return;
    }
    if (this.alreadyReserved(eventId)) return;

    const p = this.places[eventId];
    if (!p || p < 1) {
      this.showError('Please select at least 1 place.');
      return;
    }

    this.participationService.reserve({ eventId, places: p }).subscribe({
      next: () => {
        this.showSuccess('Reservation confirmed! 🎉');
        this.loadAll();
      },
      error: (err) => {
        this.showError(err?.error?.error || 'Reservation failed. Please try again.');
      }
    });
  }

  capacityPercent(event: ClubEvent): number {
    if (event.maxPlaces === 0) return 100;
    return Math.round(((event.maxPlaces - event.remainingPlaces) / event.maxPlaces) * 100);
  }
}