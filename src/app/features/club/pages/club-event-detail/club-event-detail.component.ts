import { Component, OnInit, ChangeDetectorRef }  from '@angular/core';
import { CommonModule }        from '@angular/common';
import { FormsModule }         from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { ClubEventService }         from '../../services/club-event.service';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubMemberService }        from '../../services/club-member.service';
import { AuthService }              from '../../../../core/services/auth.service';
import { ClubNavComponent }         from '../../components/club-nav/club-nav.component';

import { ClubEventDetail } from '../../models/club-event-detail.model';
import { ClubMember }      from '../../models/club-member.model';

@Component({
  selector: 'app-club-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClubNavComponent],
  templateUrl: './club-event-detail.component.html',
  styleUrls: ['./club-event-detail.component.scss'],
})
export class ClubEventDetailComponent implements OnInit {

  event: ClubEventDetail | null = null;
  myMembership: ClubMember | null = null;

  loading        = true;
  reserveLoading = false;
  places         = 1;
  alreadyReserved = false;

  success: string | null = null;
  error:   string | null = null;

  constructor(
    private route:                ActivatedRoute,
    private router:               Router,
    private eventService:         ClubEventService,
    private participationService: ClubParticipationService,
    private memberService:        ClubMemberService,
    public  auth:                 AuthService,
    private cdr:                  ChangeDetectorRef,
  ) {}

  get isAdmin(): boolean {
    return this.auth.isSuperAdmin() || this.auth.hasPermission('CLUB_MANAGE');
  }

  get isPast(): boolean {
    return !!this.event && new Date(this.event.eventDate) < new Date();
  }

  get capacityPercent(): number {
    if (!this.event || this.event.maxPlaces === 0) return 0;
    return Math.round((this.event.reservedPlaces / this.event.maxPlaces) * 100);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/club/events']); return; }

    this.eventService.getEventDetail(id).subscribe({
      next: (data) => {
        this.event = data;
        this.loading = false;
        this.cdr.detectChanges();
        if (!this.isAdmin && this.auth.isAuthenticated()) {
          this.checkAlreadyReserved();
        }
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); this.router.navigate(['/club/events']); },
    });

    if (!this.auth.isAuthenticated() || this.isAdmin) {
      this.myMembership = null;
      return;
    }

    this.memberService.getMyMembership().subscribe({
      next:  (m) => { this.myMembership = m; this.cdr.detectChanges(); },
      error: ()  => { this.myMembership = null; },
    });
  }

  private checkAlreadyReserved(): void {
    if (!this.event) return;
    this.participationService.myReservations().subscribe({
      next: (list) => {
        this.alreadyReserved = list.some(
          r => r.eventId === this.event!.id && r.status === 'CONFIRMED'
        );
      },
      error: () => {},
    });
  }

  reserve(): void {
    if (!this.myMembership || !this.event || this.alreadyReserved) return;
    if (this.places < 1) { this.showError('Sélectionne au moins 1 place.'); return; }
    if (this.places > this.event.remainingPlaces) {
      this.showError(`Seulement ${this.event.remainingPlaces} place(s) disponible(s).`);
      return;
    }

    this.reserveLoading = true;
    this.error = null;

    this.participationService.reserve({ eventId: this.event.id, places: this.places }).subscribe({
      next: () => {
        this.reserveLoading   = false;
        this.alreadyReserved  = true;
        this.event!.reservedPlaces  += this.places;
        this.event!.remainingPlaces -= this.places;
        this.showSuccess('Réservation confirmée ! 🎉');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reserveLoading = false;
        this.showError(err?.error?.error || 'Réservation échouée. Réessaie.');
        this.cdr.detectChanges();
      },
    });
  }

  private showSuccess(msg: string): void {
    this.success = msg;
    setTimeout(() => { this.success = null; }, 4000);
  }

  private showError(msg: string): void {
    this.error = msg;
    setTimeout(() => { this.error = null; }, 6000);
  }
}