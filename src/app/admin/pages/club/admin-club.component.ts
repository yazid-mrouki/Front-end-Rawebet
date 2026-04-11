import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  // ── Data ──────────────────────────────────────────────────
  members: ClubMember[] = [];
  events: ClubEvent[] = [];
  pendingRequests: ClubJoinRequest[] = [];

  // ── Feedback ──────────────────────────────────────────────
  successMessage: string | null = null;
  errorMessage: string | null = null;
  actionLoadingId: number | null = null;
  rejectTargetId: number | null = null;

  // ── Recherche membres ──────────────────────────────────────
  memberSearch = '';

  // ── Formulaire événement ───────────────────────────────────
  showEventForm = false;
  eventFormLoading = false;
  eventFormError: string | null = null;
  eventFormSuccess: string | null = null;
  eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };

  constructor(
    private memberService: ClubMemberService,
    private eventService: ClubEventService,
    private joinRequestService: ClubJoinRequestService,
  ) {}

  ngOnInit(): void {
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
      },
      error: () => { this.globalLoading = false; }
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.clearFeedback();
  }

  // ── Alertes auto-dismiss ───────────────────────────────────

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = null; }, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => { this.errorMessage = null; }, 6000);
  }

  private clearFeedback(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }

  // ── Computed — Dashboard KPIs ──────────────────────────────

  get activeMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'ACTIVE');
  }

  get leftMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'LEFT');
  }

  get upcomingEvents(): ClubEvent[] {
    const now = new Date();
    return this.events.filter(e => new Date(e.eventDate) >= now);
  }

  get pastEvents(): ClubEvent[] {
    const now = new Date();
    return this.events.filter(e => new Date(e.eventDate) < now);
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

  // ── Membres filtrés ────────────────────────────────────────

  get filteredActiveMembers(): ClubMember[] {
    const q = this.memberSearch.toLowerCase();
    return this.activeMembers.filter(m => m.userName.toLowerCase().includes(q));
  }

  get filteredLeftMembers(): ClubMember[] {
    const q = this.memberSearch.toLowerCase();
    return this.leftMembers.filter(m => m.userName.toLowerCase().includes(q));
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
        });
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.showError(err?.error?.error || 'Approval failed.');
      }
    });
  }

  confirmReject(id: number): void { this.rejectTargetId = id; }
  abortReject(): void { this.rejectTargetId = null; }

  reject(id: number): void {
    this.rejectTargetId = null;
    this.actionLoadingId = id;
    this.joinRequestService.reject(id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.showSuccess('Request rejected.');
        this.joinRequestService.getPendingRequests().subscribe(r => this.pendingRequests = r);
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.showError(err?.error?.error || 'Rejection failed.');
      }
    });
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
      next: () => {
        this.eventFormLoading = false;
        this.eventFormSuccess = 'Event created successfully!';
        this.eventService.getEvents().subscribe(e => this.events = e);
        setTimeout(() => {
          this.showEventForm = false;
          this.eventFormSuccess = null;
        }, 1500);
      },
      error: (err) => {
        this.eventFormError = err?.error?.error || 'Failed to create event.';
        this.eventFormLoading = false;
      }
    });
  }
}