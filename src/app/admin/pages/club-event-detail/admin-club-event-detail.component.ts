import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubEventService, ClubEventPayload } from '../../../features/club/services/club-event.service';
import { ClubEventDetail, ClubEventParticipant } from '../../../features/club/models/club-event-detail.model';

@Component({
  selector: 'app-admin-club-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-club-event-detail.component.html',
})
export class AdminClubEventDetailComponent implements OnInit {

  event: ClubEventDetail | null = null;
  loading = true;
  saving = false;
  deleting = false;

  successMessage: string | null = null;
  errorMessage: string | null = null;

  isEditing = false;

  form = {
    title: '',
    description: '',
    eventDate: '',
    maxPlaces: 1,
    posterUrl: '',
  };

  showDeleteConfirm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: ClubEventService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.eventService.getEventDetail(id).subscribe({
      next: (event) => {
        this.event = event;
        this.loading = false;
        this.resetForm();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load event.';
        this.cdr.detectChanges();
      },
    });
  }

  resetForm(): void {
    if (!this.event) return;
    this.form = {
      title: this.event.title,
      description: this.event.description || '',
      eventDate: this.toDatetimeLocal(this.event.eventDate),
      maxPlaces: this.event.maxPlaces,
      posterUrl: this.event.posterUrl || '',
    };
  }

  private toDatetimeLocal(dateStr: string): string {
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  startEdit(): void {
    this.isEditing = true;
    this.resetForm();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.resetForm();
    this.clearFeedback();
  }

  save(): void {
    if (!this.event) return;
    if (!this.form.title.trim() || !this.form.eventDate) {
      this.errorMessage = 'Title and date are required.';
      return;
    }
    this.saving = true;
    this.clearFeedback();

    const payload: ClubEventPayload = {
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      eventDate: this.form.eventDate,
      maxPlaces: this.form.maxPlaces,
      posterUrl: this.form.posterUrl.trim() || undefined,
    };

    this.eventService.updateEvent(this.event.id, payload).subscribe({
      next: (updated) => {
        this.event = { ...this.event!, ...updated };
        this.saving = false;
        this.isEditing = false;
        this.showSuccess('Event updated successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to update event.';
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  deleteEvent(): void {
    if (!this.event) return;
    this.deleting = true;
    this.eventService.deleteEvent(this.event.id).subscribe({
      next: () => {
        this.router.navigate(['/admin/club'], { queryParams: { tab: 'events' } });
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = err?.error?.error || 'Failed to delete event.';
        this.showDeleteConfirm = false;
        this.cdr.detectChanges();
      },
    });
  }

  capacityPercent(): number {
    if (!this.event || this.event.maxPlaces === 0) return 0;
    return Math.round((this.event.reservedPlaces / this.event.maxPlaces) * 100);
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => { this.successMessage = null; }, 4000);
  }

  private clearFeedback(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }
}