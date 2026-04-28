import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EventSpaceService } from '../../../features/event/services/event-space.service';
import { EvenementService } from '../../../features/event/services/evenement.service';
import { EventSpace, CreateEventSpaceRequest, UpdateEventSpaceRequest, SalleType, SalleStatus } from '../../../features/event/models/event-space.model';
import { Evenement } from '../../../features/event/models/evenement.model';

type ModalStep = 'list' | 'create' | 'edit';

@Component({
  selector: 'app-admin-event-spaces',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-event-spaces.component.html'
})
export class AdminEventSpacesComponent implements OnInit, OnDestroy {

  // ── List management ──────────────────────────────
  eventSpaces: EventSpace[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';
  selectedStatusFilter = 'all';

  // ── Modal state ──────────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'list';
  isSubmitting = false;
  errorMessage = '';
  selectedSpace: EventSpace | null = null;

  // ── Form state ───────────────────────────────────
  form: CreateEventSpaceRequest = this.emptyForm();

  // ── Events/Reservations ──────────────────────────
  events: Evenement[] = [];
  showEventsModal = false;
  eventsLoading = false;
  eventsError = '';
  selectedSpaceForEvents: EventSpace | null = null;

  // ── Search subject ───────────────────────────────
  searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Enum references for template ─────────────────
  salleTypeOptions = Object.values(SalleType);
  salleStatusOptions = Object.values(SalleStatus);

  constructor(
    private eventSpaceService: EventSpaceService,
    private evenementService: EvenementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEventSpaces();

    // Search with debounce
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ── Loading ──────────────────────────────────────────
  loadEventSpaces(): void {
    this.isLoading = true;
    this.eventSpaceService.getAllSalles().subscribe({
      next: (data) => {
        this.eventSpaces = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load event spaces.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Filtering ────────────────────────────────────
  get filteredSpaces(): EventSpace[] {
    return this.eventSpaces.filter(space => {
      const matchSearch = space.nom.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.selectedStatusFilter === 'all' || space.status === this.selectedStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  // ── Modal Management ─────────────────────────────
  openCreateModal(): void {
    this.form = this.emptyForm();
    this.selectedSpace = null;
    this.modalStep = 'create';
    this.showModal = true;
    this.errorMessage = '';
  }

  openEditModal(space: EventSpace): void {
    this.selectedSpace = space;
    this.form = {
      nom: space.nom,
      capacite: space.capacite,
      type: space.type,
      status: space.status
    };
    this.modalStep = 'edit';
    this.showModal = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.modalStep = 'list';
    this.form = this.emptyForm();
    this.selectedSpace = null;
    this.errorMessage = '';
  }

  // ── Form Submission ──────────────────────────────
  submitForm(): void {
    if (!this.validateForm()) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Ensure status and type are properly formatted strings
    const formData: CreateEventSpaceRequest = {
      nom: this.form.nom,
      capacite: this.form.capacite,
      status: this.form.status as SalleStatus,
      type: this.form.type as SalleType
    };

    if (this.modalStep === 'create') {
      this.eventSpaceService.addSalle(formData).subscribe({
        next: (newSpace) => {
          this.eventSpaces.push(newSpace);
          this.closeModal();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to create event space.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else if (this.modalStep === 'edit' && this.selectedSpace) {
      const updateData: UpdateEventSpaceRequest = {
        ...formData,
        id: this.selectedSpace.id
      };

      // First update the main salle info (nom, capacite, type)
      this.eventSpaceService.updateSalle(this.selectedSpace.id, updateData).subscribe({
        next: () => {
          // Then update status separately using PATCH endpoint
          this.eventSpaceService.updateStatus(this.selectedSpace!.id, formData.status).subscribe({
            next: (finalSpace) => {
              const index = this.eventSpaces.findIndex(e => e.id === finalSpace.id);
              if (index !== -1) {
                this.eventSpaces[index] = finalSpace;
              }
              this.closeModal();
              this.isSubmitting = false;
              this.cdr.detectChanges();
            },
            error: () => {
              this.errorMessage = 'Failed to update event space status.';
              this.isSubmitting = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {
          this.errorMessage = 'Failed to update event space.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ── Delete ───────────────────────────────────────────
  deleteSpace(id: number): void {
    if (!confirm('Are you sure you want to delete this event space?')) {
      return;
    }

    this.eventSpaceService.deleteSalle(id).subscribe({
      next: () => {
        this.eventSpaces = this.eventSpaces.filter(e => e.id !== id);
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Failed to delete event space.');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────
  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-600';
      case 'MAINTENANCE': return 'bg-yellow-50 text-yellow-700';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getTypeLabel(type: string): string {
    return type.replace(/_/g, ' ');
  }

  private validateForm(): boolean {
    return !!(this.form.nom?.trim() && this.form.capacite > 0 && this.form.type && this.form.status);
  }

  private emptyForm(): CreateEventSpaceRequest {
    return {
      nom: '',
      capacite: 0,
      type: SalleType.INTERIEUR,
      status: SalleStatus.ACTIVE
    };
  }

  onStatusFilterChange(): void {
    this.cdr.detectChanges();
  }

  onStatusChange(event: any): void {
    // Ensure the value is properly set
    console.log('Status changed to:', this.form.status, 'Type:', typeof this.form.status);
    this.form.status = this.form.status as SalleStatus;
  }

  // ── View Events/Reservations ────────────────────

  viewSpaceEvents(space: EventSpace): void {
    this.selectedSpaceForEvents = space;
    this.showEventsModal = true;
    this.loadEventsForSpace(space.id);
  }

  loadEventsForSpace(spaceId: number): void {
    this.eventsLoading = true;
    this.eventsError = '';
    this.evenementService.getEvenementsBySalle(spaceId).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.events = data;
          this.eventsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading events:', err);
        setTimeout(() => {
          this.eventsError = 'Failed to load events for this space.';
          this.events = [];
          this.eventsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  closeEventsModal(): void {
    this.showEventsModal = false;
    this.selectedSpaceForEvents = null;
    this.events = [];
    this.eventsError = '';
  }
}
