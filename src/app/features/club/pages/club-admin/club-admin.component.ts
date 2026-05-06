import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClubJoinRequestService } from '../../services/club-join-request.service';
import { ClubMemberService } from '../../services/club-member.service';
import { ClubEventService } from '../../services/club-event.service';
import { ClubJoinRequest } from '../../models/club-join-request.model';
import { ClubMember } from '../../models/club-member.model';
import { ClubEvent } from '../../models/club-event.model';
import { ClubNavComponent } from '../../components/club-nav/club-nav.component';

type Tab = 'requests' | 'members' | 'events';

@Component({
  selector: 'app-club-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClubNavComponent],
  templateUrl: './club-admin.component.html',
  styleUrls: ['./club-admin.component.scss'],
})
export class ClubAdminComponent implements OnInit {
  activeTab: Tab = 'requests';
  globalLoading = true;

  // ── Requests ─────────────────────────────────────────────
  pendingRequests: ClubJoinRequest[] = [];
  actionLoadingId: number | null = null;
  requestSuccess: string | null = null;
  requestError: string | null = null;
  rejectTargetId: number | null = null;

  // ── Members ──────────────────────────────────────────────
  members: ClubMember[] = [];

  // ── Events ───────────────────────────────────────────────
  events: ClubEvent[] = [];
  showEventForm = false;
  eventFormLoading = false;
  eventFormError: string | null = null;
  eventFormSuccess: string | null = null;
  eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };

  constructor(
    private joinRequestService: ClubJoinRequestService,
    private memberService: ClubMemberService,
    private eventService: ClubEventService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.globalLoading = true;
    forkJoin({
      requests: this.joinRequestService.getPendingRequests(),
      members: this.memberService.getAllMembers(),
      events: this.eventService.getEvents(),
    }).subscribe({
      next: ({ requests, members, events }) => {
        this.pendingRequests = requests;
        this.members = members;
        this.events = events;
        this.globalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.globalLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.requestSuccess = null;
    this.requestError = null;
  }

  // ── Auto-dismiss alerts ──────────────────────────────────

  private showRequestSuccess(msg: string): void {
    this.requestSuccess = msg;
    setTimeout(() => {
      this.requestSuccess = null;
    }, 4000);
  }

  private showRequestError(msg: string): void {
    this.requestError = msg;
    setTimeout(() => {
      this.requestError = null;
    }, 6000);
  }

  private showEventFormSuccess(msg: string): void {
    this.eventFormSuccess = msg;
    setTimeout(() => {
      this.eventFormSuccess = null;
    }, 4000);
  }

  // ── Requests ─────────────────────────────────────────────

  approve(id: number): void {
    this.actionLoadingId = id;
    this.requestSuccess = null;
    this.requestError = null;
    this.joinRequestService.approve(id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.showRequestSuccess('Request approved — member added.');
        forkJoin({
          requests: this.joinRequestService.getPendingRequests(),
          members: this.memberService.getAllMembers(),
        }).subscribe(({ requests, members }) => {
          this.pendingRequests = requests;
          this.members = members;
        });
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.showRequestError(err?.error?.error || 'Approval failed.');
      },
    });
  }

  confirmReject(id: number): void {
    this.rejectTargetId = id;
  }
  abortReject(): void {
    this.rejectTargetId = null;
  }

  reject(id: number): void {
    this.rejectTargetId = null;
    this.actionLoadingId = id;
    this.requestSuccess = null;
    this.requestError = null;
    this.joinRequestService.reject(id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.showRequestSuccess('Request rejected.');
        this.joinRequestService.getPendingRequests().subscribe((r) => (this.pendingRequests = r));
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.showRequestError(err?.error?.error || 'Rejection failed.');
      },
    });
  }

  // ── Members ──────────────────────────────────────────────

  get activeMembers(): ClubMember[] {
    return this.members.filter((m) => m.status === 'ACTIVE');
  }

  get leftMembers(): ClubMember[] {
    return this.members.filter((m) => m.status === 'LEFT');
  }

  // ── Events ───────────────────────────────────────────────

  toggleEventForm(): void {
    this.showEventForm = !this.showEventForm;
    this.eventFormError = null;
    this.eventFormSuccess = null;
    this.eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };
  }

  createEvent(): void {
    if (!this.eventForm.title.trim() || !this.eventForm.eventDate) {
      this.eventFormError = 'Title and date are required.';
      return;
    }
    this.eventFormLoading = true;
    this.eventFormError = null;
    this.eventFormSuccess = null;

    this.eventService.createEvent(this.eventForm).subscribe({
      next: (created) => {
        this.events = [...this.events, created]; // direct add without a second HTTP call
        this.eventFormLoading = false;
        this.showEventFormSuccess('Event created successfully!');
        setTimeout(() => {
          this.showEventForm = false;
          this.eventFormSuccess = null;
          this.eventForm = {
            title: '',
            description: '',
            eventDate: '',
            maxPlaces: 1,
            posterUrl: '',
          };
        }, 1500);
      },
      error: (err) => {
        this.eventFormError = err?.error?.error || 'Failed to create event.';
        this.eventFormLoading = false;
      },
    });
  }

  capacityPercent(event: ClubEvent): number {
    if (event.maxPlaces === 0) return 0;
    return Math.round((event.reservedPlaces / event.maxPlaces) * 100);
  }
}