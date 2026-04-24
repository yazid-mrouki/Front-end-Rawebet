import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClubMemberService } from '../../../features/club/services/club-member.service';
import { ClubEventService } from '../../../features/club/services/club-event.service';
import { ClubJoinRequestService } from '../../../features/club/services/club-join-request.service';
import { ClubMember } from '../../../features/club/models/club-member.model';
import { ClubEvent } from '../../../features/club/models/club-event.model';
import { ClubJoinRequest } from '../../../features/club/models/club-join-request.model';

type Tab = 'dashboard' | 'requests' | 'members' | 'events';

@Component({
  selector: 'app-admin-club',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-club.component.html',
})
export class AdminClubComponent implements OnInit {
  activeTab: Tab = 'dashboard';
  globalLoading = true;

  members: ClubMember[] = [];
  events: ClubEvent[] = [];
  pendingRequests: ClubJoinRequest[] = [];

  successMessage: string | null = null;
  errorMessage: string | null = null;
  actionLoadingId: number | null = null;
  rejectTargetId: number | null = null;

  memberSearch = '';

  showEventForm = false;
  eventFormLoading = false;
  eventFormError: string | null = null;
  eventFormSuccess: string | null = null;
  eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };

  // ✅ Remove member
  removeTargetId: number | null = null;
  removeReason = '';
  removeLoading = false;

  constructor(
    private memberService: ClubMemberService,
    private eventService: ClubEventService,
    private joinRequestService: ClubJoinRequestService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParams['tab'] as Tab;
    if (tab && ['dashboard', 'requests', 'members', 'events'].includes(tab)) {
      this.activeTab = tab;
    }
    this.loadAll();
  }

  loadAll(): void {
    this.globalLoading = true;
    forkJoin({
      members: this.memberService.getAllMembers(),
      events: this.eventService.getEvents(),
      requests: this.joinRequestService.getPendingRequests(),
    }).subscribe({
      next: ({ members, events, requests }) => {
        this.members = members;
        this.events = events;
        this.pendingRequests = requests;
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
    this.clearFeedback();
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => {
      this.successMessage = null;
    }, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => {
      this.errorMessage = null;
    }, 6000);
  }

  private clearFeedback(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }

  // ── Computed ───────────────────────────────────────────────

  get activeMembers(): ClubMember[] {
    return this.members.filter((m) => m.status === 'ACTIVE');
  }

  get leftMembers(): ClubMember[] {
    return this.members.filter((m) => m.status === 'LEFT');
  }

  get removedMembers(): ClubMember[] {
    return this.members.filter((m) => m.status === 'REMOVED');
  }

  get upcomingEvents(): ClubEvent[] {
    return this.events.filter((e) => new Date(e.eventDate) >= new Date());
  }

  get pastEvents(): ClubEvent[] {
    return this.events.filter((e) => new Date(e.eventDate) < new Date());
  }

  get totalReservedPlaces(): number {
    return this.events.reduce((sum, e) => sum + e.reservedPlaces, 0);
  }

  get totalMaxPlaces(): number {
    return this.events.reduce((sum, e) => sum + e.maxPlaces, 0);
  }

  get globalFillRate(): number {
    if (this.totalMaxPlaces === 0) return 0;
    return Math.round((this.totalReservedPlaces / this.totalMaxPlaces) * 100);
  }

  capacityPercent(event: ClubEvent): number {
    if (event.maxPlaces === 0) return 0;
    return Math.round((event.reservedPlaces / event.maxPlaces) * 100);
  }

  get filteredActiveMembers(): ClubMember[] {
    const q = this.memberSearch.toLowerCase();
    return this.activeMembers.filter((m) => m.userName.toLowerCase().includes(q));
  }

  get filteredLeftMembers(): ClubMember[] {
    const q = this.memberSearch.toLowerCase();
    return this.leftMembers.filter((m) => m.userName.toLowerCase().includes(q));
  }

  get filteredRemovedMembers(): ClubMember[] {
    const q = this.memberSearch.toLowerCase();
    return this.removedMembers.filter((m) => m.userName.toLowerCase().includes(q));
  }

  // ── Demandes ───────────────────────────────────────────────

  approve(id: number): void {
    this.actionLoadingId = id;
    this.joinRequestService.approve(id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.showSuccess('Request approved — member added.');
        forkJoin({
          requests: this.joinRequestService.getPendingRequests(),
          members: this.memberService.getAllMembers(),
        }).subscribe(({ requests, members }) => {
          this.pendingRequests = requests;
          this.members = members;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.showError(err?.error?.error || 'Approval failed.');
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
    this.joinRequestService.reject(id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.showSuccess('Request rejected.');
        this.joinRequestService.getPendingRequests().subscribe((r) => {
          this.pendingRequests = r;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.showError(err?.error?.error || 'Rejection failed.');
      },
    });
  }

  // ── Remove member ──────────────────────────────────────────

  confirmRemove(id: number): void {
    this.removeTargetId = id;
    this.removeReason = '';
  }

  abortRemove(): void {
    this.removeTargetId = null;
    this.removeReason = '';
  }

  removeMember(): void {
    if (this.removeTargetId === null) return;
    const id = this.removeTargetId;
    this.removeLoading = true;

    this.memberService.removeMember(id, this.removeReason || undefined).subscribe({
      next: (updated) => {
        // Mise à jour directe dans le tableau sans second appel HTTP
        this.members = this.members.map((m) => (m.id === updated.id ? updated : m));
        this.removeLoading = false;
        this.removeTargetId = null;
        this.removeReason = '';
        this.showSuccess('Member removed from the club.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.removeLoading = false;
        this.showError(err?.error?.error || 'Failed to remove member.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Navigation ─────────────────────────────────────────────

  goToEvent(id: number): void {
    this.router.navigate(['/admin/club/events', id]);
  }

  // ── Événements ─────────────────────────────────────────────

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
        this.events = [...this.events, created];
        this.eventFormLoading = false;
        this.showEventForm = false;
        this.eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };
        this.showSuccess('Event created successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.eventFormError = err?.error?.error || 'Failed to create event.';
        this.eventFormLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}