import { Component, OnInit } from '@angular/core';
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

type Tab = 'requests' | 'members' | 'events';

@Component({
  selector: 'app-club-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './club-admin.component.html',
  styleUrls: ['./club-admin.component.scss']
})
export class ClubAdminComponent implements OnInit {

  activeTab: Tab = 'requests';
  globalLoading = true; // Un seul état de chargement global

  // ── Demandes ──────────────────────────────────────────────
  pendingRequests: ClubJoinRequest[] = [];
  actionLoadingId: number | null = null;
  requestSuccess: string | null = null;
  requestError: string | null = null;

  // ── Membres ───────────────────────────────────────────────
  members: ClubMember[] = [];

  // ── Événements ────────────────────────────────────────────
  events: ClubEvent[] = [];
  showEventForm = false;
  eventFormLoading = false;
  eventFormError: string | null = null;
  eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };

  constructor(
    private joinRequestService: ClubJoinRequestService,
    private memberService: ClubMemberService,
    private eventService: ClubEventService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  // Charge tout en parallèle — une seule attente, pas de loading successifs
  loadAll(): void {
    this.globalLoading = true;
    forkJoin({
      requests: this.joinRequestService.getPendingRequests(),
      members: this.memberService.getAllMembers(),
      events: this.eventService.getEvents()
    }).subscribe({
      next: ({ requests, members, events }) => {
        this.pendingRequests = requests;
        this.members = members;
        this.events = events;
        this.globalLoading = false;
      },
      error: () => {
        this.globalLoading = false;
      }
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.requestSuccess = null;
    this.requestError = null;
  }

  // ── Demandes ──────────────────────────────────────────────

  approve(id: number): void {
    this.actionLoadingId = id;
    this.requestSuccess = null;
    this.requestError = null;
    this.joinRequestService.approve(id).subscribe({
      next: () => {
        this.requestSuccess = 'Request approved — member added.';
        this.actionLoadingId = null;
        // Recharger requests + members ensemble
        forkJoin({
          requests: this.joinRequestService.getPendingRequests(),
          members: this.memberService.getAllMembers()
        }).subscribe(({ requests, members }) => {
          this.pendingRequests = requests;
          this.members = members;
        });
      },
      error: (err) => {
        this.requestError = err?.error?.error || 'Approval failed.';
        this.actionLoadingId = null;
      }
    });
  }

  reject(id: number): void {
    this.actionLoadingId = id;
    this.requestSuccess = null;
    this.requestError = null;
    this.joinRequestService.reject(id).subscribe({
      next: () => {
        this.requestSuccess = 'Request rejected.';
        this.actionLoadingId = null;
        this.joinRequestService.getPendingRequests().subscribe(r => this.pendingRequests = r);
      },
      error: (err) => {
        this.requestError = err?.error?.error || 'Rejection failed.';
        this.actionLoadingId = null;
      }
    });
  }

  // ── Membres ───────────────────────────────────────────────

  get activeMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'ACTIVE');
  }

  get leftMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'LEFT');
  }

  // ── Événements ────────────────────────────────────────────

  toggleEventForm(): void {
    this.showEventForm = !this.showEventForm;
    this.eventFormError = null;
    this.eventForm = { title: '', description: '', eventDate: '', maxPlaces: 1, posterUrl: '' };
  }

  createEvent(): void {
    if (!this.eventForm.title.trim() || !this.eventForm.eventDate) {
      this.eventFormError = 'Title and date are required.';
      return;
    }
    this.eventFormLoading = true;
    this.eventFormError = null;
    this.eventService.createEvent(this.eventForm).subscribe({
      next: () => {
        this.eventFormLoading = false;
        this.showEventForm = false;
        this.eventService.getEvents().subscribe(e => this.events = e);
      },
      error: (err) => {
        this.eventFormError = err?.error?.error || 'Failed to create event.';
        this.eventFormLoading = false;
      }
    });
  }

  capacityPercent(event: ClubEvent): number {
    if (event.maxPlaces === 0) return 0;
    return Math.round((event.reservedPlaces / event.maxPlaces) * 100);
  }
}