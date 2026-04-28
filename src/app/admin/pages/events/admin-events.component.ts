import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EvenementService } from '../../../features/event/services/evenement.service';
import { EventSpaceService } from '../../../features/event/services/event-space.service';
import { MaterielService } from '../../../features/material/services/materiel.service';
import { ReservationEvenementService } from '../../../features/event/services/reservation-evenement.service';
import { Evenement, CreateEvenementRequest, UpdateEvenementRequest, EvenementStatus, EvenementMateriel, EvenementMaterielRequestDTO, TypeCategorie } from '../../../features/event/models/evenement.model';
import { EventSpace } from '../../../features/event/models/event-space.model';
import { Materiel } from '../../../features/material/models/materiel.model';
import { ReservationEvenement, ReservationEvenementAttribut } from '../../../features/event/models/reservation-evenement.model';

type ModalStep = 'list' | 'form';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-events.component.html'
})
export class AdminEventsComponent implements OnInit, OnDestroy {

  // ── List management ──────────────────────────────
  evenements: Evenement[] = [];
  salles: EventSpace[] = [];
  materiels: Materiel[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';
  selectedStatusFilter = 'all';

  // ── Modal state ──────────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'list';
  isSubmitting = false;
  errorMessage = '';
  selectedEvenement: Evenement | null = null;

  // ── Form state ───────────────────────────────────
  form: CreateEvenementRequest = this.emptyForm();

  // ── Material assignment state ────────────────
  eventMateriels: EvenementMateriel[] = [];
  selectedMaterielId = 0;
  selectedMaterielQuantite = 0;
  materielErrorMessage = '';
  loadingMateriels = false;
  editingMaterielId: number | null = null;
  editingMaterielQuantite = 0;

  // ── Reservations ─────────────────────────────────
  reservations: ReservationEvenement[] = [];
  showReservationsModal = false;
  reservationsLoading = false;
  reservationsError = '';
  selectedEvenementForReservations: Evenement | null = null;
  showStatusModal = false;
  selectedReservationForStatusChange: ReservationEvenement | null = null;
  newReservationStatus = '';
  statusModificationError = ''; // Error message for status modification

  // ── Computed reservation filters ─────────────────
  get confirmedReservations(): ReservationEvenement[] {
    return this.reservations.filter(r => !r.enAttente);
  }

  get waitlistReservations(): ReservationEvenement[] {
    return this.reservations.filter(r => r.enAttente);
  }

  // ── Search subject ───────────────────────────────
  searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Enum references for template ─────────────────
  statusOptions = Object.values(EvenementStatus);
  categorieOptions = Object.values(TypeCategorie);
  ReservationEvenementAttribut = ReservationEvenementAttribut;

  constructor(
    private evenementService: EvenementService,
    private eventSpaceService: EventSpaceService,
    private materielService: MaterielService,
    private reservationService: ReservationEvenementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEvenements();
    this.loadSalles();
    this.loadMateriels();

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

  // ── Loading ──────────────────────────────────────
  loadEvenements(): void {
    this.isLoading = true;
    this.evenementService.getAllEvenements().subscribe({
      next: (data) => {
        console.log('📋 Events loaded:', data);
        this.evenements = data;

        // Fetch all reservations to calculate placesRestantes
        this.reservationService.getAll().subscribe({
          next: (allReservations) => {
            console.log('📝 All reservations:', allReservations);
            // Calculate placesRestantes for each event
            this.evenements.forEach(event => {
              // Get only ACTIVE reservations (CONFIRMED or EN_ATTENTE), exclude CANCELLED
              const eventReservations = allReservations.filter(r => r.evenementId === event.id);
              console.log(`Event "${event.titre}" reservations:`, eventReservations.map(r => ({
                user: r.userNom,
                statut: r.statut,
                enAttente: r.enAttente
              })));
              const activeCount = eventReservations.filter(r => r.statut !== 'CANCELLED').length;
              event.placesRestantes = Math.max(0, event.nombreDePlaces - activeCount);
              console.log(`Event "${event.titre}": Total=${event.nombreDePlaces}, Active=${activeCount}, Remaining=${event.placesRestantes}`);
            });
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('❌ Error loading reservations:', err);
            // If error getting reservations, assume no reservations
            this.evenements.forEach(event => {
              event.placesRestantes = event.nombreDePlaces;
            });
            this.cdr.detectChanges();
          }
        });

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load events.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSalles(): void {
    this.eventSpaceService.getAllSalles().subscribe({
      next: (data) => {
        this.salles = data;
        this.cdr.detectChanges();
      },
      error: () => {
        console.error('Failed to load event spaces.');
      }
    });
  }

  loadMateriels(): void {
    this.materielService.getAllMateriels().subscribe({
      next: (data) => {
        this.materiels = data;
        this.cdr.detectChanges();
      },
      error: () => {
        console.error('Failed to load materials.');
      }
    });
  }

  // ── Filtering ────────────────────────────────────
  get filteredEvenements(): Evenement[] {
    return this.evenements.filter(event => {
      const matchSearch = event.titre.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.selectedStatusFilter === 'all' || event.status === this.selectedStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  // ── Modal Management ─────────────────────────────
  openCreateModal(): void {
    this.form = this.emptyForm();
    this.selectedEvenement = null;
    this.eventMateriels = [];
    this.selectedMaterielId = 0;
    this.selectedMaterielQuantite = 0;
    this.materielErrorMessage = '';
    this.modalStep = 'form';
    this.showModal = true;
    this.errorMessage = '';
  }

  openEditModal(evenement: Evenement): void {
    this.selectedEvenement = evenement;
    this.form = {
      titre: evenement.titre,
      description: evenement.description,
      dateDebut: evenement.dateDebut,
      dateFin: evenement.dateFin,
      nombreDePlaces: evenement.nombreDePlaces,
      salleId: evenement.salleId || 0,
      status: evenement.status,
      categorie: evenement.categorie,
      prixUnitaire: evenement.prixUnitaire
    };
    this.materielErrorMessage = '';
    this.selectedMaterielId = 0;
    this.selectedMaterielQuantite = 0;
    this.loadEventMateriels(evenement.id!);
    this.modalStep = 'form';
    this.showModal = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.modalStep = 'list';
    this.form = this.emptyForm();
    this.selectedEvenement = null;
    this.errorMessage = '';
    this.eventMateriels = [];
    this.selectedMaterielId = 0;
    this.selectedMaterielQuantite = 0;
    this.materielErrorMessage = '';
    this.editingMaterielId = null;
    this.editingMaterielQuantite = 0;
  }

  // ── Material Management ──────────────────────────
  loadEventMateriels(evenementId: number): void {
    this.loadingMateriels = true;
    this.evenementService.getMaterielsByEvenement(evenementId).subscribe({
      next: (data) => {
        this.eventMateriels = data;
        this.loadingMateriels = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading event materials:', err);
        this.materielErrorMessage = 'Failed to load materials.';
        this.loadingMateriels = false;
        this.cdr.detectChanges();
      }
    });
  }

  assignMateriel(): void {
    if (this.selectedMaterielId <= 0) {
      this.materielErrorMessage = 'Please select a material.';
      return;
    }

    if (this.selectedMaterielQuantite <= 0) {
      this.materielErrorMessage = 'Quantity must be greater than 0.';
      return;
    }

    if (!this.selectedEvenement?.id) {
      this.materielErrorMessage = 'Event not selected.';
      return;
    }

    const dto: EvenementMaterielRequestDTO = {
      evenementId: this.selectedEvenement.id,
      materielId: this.selectedMaterielId,
      quantite: this.selectedMaterielQuantite
    };

    this.materielErrorMessage = '';
    this.evenementService.assignMateriel(dto).subscribe({
      next: (assigned) => {
        this.eventMateriels.push(assigned);
        this.selectedMaterielId = 0;
        this.selectedMaterielQuantite = 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error assigning material:', err);
        this.materielErrorMessage = err.error?.message || err.error?.error || 'Failed to assign material.';
        this.cdr.detectChanges();
      }
    });
  }

  removeMaterielFromEvent(materielId: number): void {
    if (!confirm('Are you sure you want to remove this material?')) {
      return;
    }

    this.evenementService.removeMateriel(materielId).subscribe({
      next: () => {
        this.eventMateriels = this.eventMateriels.filter(m => m.id !== materielId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error removing material:', err);
        this.materielErrorMessage = 'Failed to remove material.';
        this.cdr.detectChanges();
      }
    });
  }

  getMaterielName(materielId: number): string {
    return this.materiels.find(m => m.id === materielId)?.nom || 'Unknown';
  }

  startEditMateriel(materiel: EvenementMateriel): void {
    this.editingMaterielId = materiel.id;
    this.editingMaterielQuantite = materiel.quantite;
    this.materielErrorMessage = '';
  }

  cancelEditMateriel(): void {
    this.editingMaterielId = null;
    this.editingMaterielQuantite = 0;
  }

  saveEditMateriel(materiel: EvenementMateriel): void {
    if (this.editingMaterielQuantite <= 0) {
      this.materielErrorMessage = 'Quantity must be greater than 0.';
      return;
    }

    console.log('Updating material:', materiel.id, 'with quantity:', this.editingMaterielQuantite);
    this.evenementService.updateMaterielQuantite(materiel.id, this.editingMaterielQuantite).subscribe({
      next: (updated) => {
        console.log('Material updated successfully:', updated);
        const index = this.eventMateriels.findIndex(m => m.id === materiel.id);
        if (index !== -1) {
          this.eventMateriels[index] = updated;
        }
        this.editingMaterielId = null;
        this.editingMaterielQuantite = 0;
        this.materielErrorMessage = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Full error response:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.error?.message || err.error?.error || err.message);
        this.materielErrorMessage = err.error?.message || err.error?.error || err.error?.detail || 'Failed to update quantity.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Form Submission ──────────────────────────────
  submitForm(): void {
    if (!this.validateForm()) {
      return; // Error message is already set in validateForm()
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Ensure status is set
    if (!this.form.status) {
      this.form.status = EvenementStatus.DRAFT;
    }

    const formData: CreateEvenementRequest = {
      titre: this.form.titre,
      description: this.form.description,
      dateDebut: this.form.dateDebut,
      dateFin: this.form.dateFin,
      nombreDePlaces: this.form.nombreDePlaces,
      salleId: this.form.salleId,
      status: this.form.status as EvenementStatus,
      categorie: this.form.categorie,
      prixUnitaire: this.form.prixUnitaire
    };

    console.log('Form data being submitted:', formData);

    if (!this.selectedEvenement) {
      this.evenementService.addEvenement(formData).subscribe({
        next: (newEvent) => {
          setTimeout(() => {
            this.evenements.push(newEvent);
            this.selectedEvenement = newEvent;
            this.isSubmitting = false;
            this.closeModal();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 0);
        },
        error: (err) => {
          console.error('Error creating event:', err);
          setTimeout(() => {
            this.errorMessage = err.error?.message || err.error?.error || 'Failed to create event.';
            this.isSubmitting = false;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 0);
        }
      });
    } else {
      const updateData: UpdateEvenementRequest = {
        ...formData,
        id: this.selectedEvenement.id
      };

      this.evenementService.updateEvenement(this.selectedEvenement.id, updateData).subscribe({
        next: (updatedEvent) => {
          setTimeout(() => {
            const index = this.evenements.findIndex(e => e.id === updatedEvent.id);
            if (index !== -1) {
              this.evenements[index] = updatedEvent;
            }

            this.isSubmitting = false;
            this.closeModal();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 0);
        },
        error: (err) => {
          console.error('Error updating event:', err);
          setTimeout(() => {
            this.errorMessage = err.error?.message || err.error?.error || 'Failed to update event.';
            this.isSubmitting = false;
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 0);
        }
      });
    }
  }

  // ── Delete ───────────────────────────────────────
  deleteEvenement(id: number): void {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    this.evenementService.deleteEvenement(id).subscribe({
      next: () => {
        this.evenements = this.evenements.filter(e => e.id !== id);
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Failed to delete event.');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────
  getStatusClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'bg-gray-50 text-gray-600';
      case 'PUBLISHED': return 'bg-green-50 text-green-600';
      case 'CANCELLED': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getAttributeClass(attribut: string | undefined): string {
    if (attribut === 'Confirmed' || attribut === ReservationEvenementAttribut.CONFIRMED) {
      return 'bg-orange-100 text-orange-700';
    } else if (attribut === 'Already Used' || attribut === ReservationEvenementAttribut.ALREADY_USED) {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-gray-100 text-gray-700';
  }

  getSalleNom(salleId: number): string {
    return this.salles.find(s => s.id === salleId)?.nom || 'Unknown';
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  getCurrentDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  private validateForm(): boolean {
    // Check required fields
    if (!this.form.titre?.trim()) {
      this.errorMessage = 'Event title is required.';
      return false;
    }
    if (!this.form.description?.trim()) {
      this.errorMessage = 'Description is required.';
      return false;
    }
    if (!this.form.dateDebut) {
      this.errorMessage = 'Start date is required.';
      return false;
    }
    if (!this.form.dateFin) {
      this.errorMessage = 'End date is required.';
      return false;
    }
    if (this.form.nombreDePlaces <= 0) {
      this.errorMessage = 'Number of places must be greater than 0.';
      return false;
    }
    if (this.form.salleId <= 0) {
      this.errorMessage = 'Please select an event space.';
      return false;
    }
    if (!this.form.status) {
      this.errorMessage = 'Status is required.';
      return false;
    }

    // Date validation
    const startDate = new Date(this.form.dateDebut);
    const endDate = new Date(this.form.dateFin);
    const now = new Date();

    // Start date must be in the future
    if (startDate <= now) {
      this.errorMessage = 'Start date must be in the future.';
      return false;
    }

    // End date must be after start date
    if (endDate <= startDate) {
      this.errorMessage = 'End date must be after start date.';
      return false;
    }

    return true;
  }

  private emptyForm(): CreateEvenementRequest {
    return {
      titre: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      nombreDePlaces: 0,
      salleId: 0,
      status: EvenementStatus.DRAFT,
      categorie: TypeCategorie.AUTRE,
      prixUnitaire: 0
    };
  }

  onStatusFilterChange(): void {
    this.cdr.detectChanges();
  }

  onStatusChange(event: any): void {
    console.log('Status changed event:', event);
    console.log('Current form.status:', this.form.status);
    console.log('Form status type:', typeof this.form.status);
    this.form.status = this.form.status as EvenementStatus;
  }

  // ── View Reservations ────────────────────────────

  viewEvenementReservations(evenement: Evenement): void {
    this.selectedEvenementForReservations = evenement;
    this.showReservationsModal = true;
    this.loadReservationsForEvenement(evenement.id);
  }

  loadReservationsForEvenement(evenementId: number): void {
    this.reservationsLoading = true;
    this.reservationsError = '';
    this.reservationService.getByEvenement(evenementId).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.reservations = data;
          this.reservationsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading reservations:', err);
        setTimeout(() => {
          this.reservationsError = 'Failed to load reservations.';
          this.reservations = [];
          this.reservationsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  closeReservationsModal(): void {
    this.showReservationsModal = false;
    this.selectedEvenementForReservations = null;
    this.reservations = [];
    this.reservationsError = '';
  }

  modifyReservationStatus(reservation: ReservationEvenement): void {
    this.selectedReservationForStatusChange = reservation;
    this.newReservationStatus = reservation.statut;
    this.showStatusModal = true;

    // Check if reservation is cancelled and set error message
    if (reservation.statut === 'CANCELLED') {
      this.statusModificationError = '❌ You cannot change a cancelled reservation';
    } else {
      this.statusModificationError = ''; // Clear any previous error
    }

    this.cdr.markForCheck();
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedReservationForStatusChange = null;
    this.newReservationStatus = '';
    this.statusModificationError = '';
  }

  submitStatusChange(): void {
    if (!this.selectedReservationForStatusChange || !this.newReservationStatus) {
      return;
    }

    const reservationId = this.selectedReservationForStatusChange.id;

    if (this.newReservationStatus === 'CANCELLED') {
      this.cancelReservation(reservationId);
    } else if (this.newReservationStatus === 'CONFIRMED') {
      this.confirmReservation(reservationId);
    } else if (this.newReservationStatus === 'PENDING') {
      // Update reservation status to PENDING if there's a specific endpoint
      // For now, just reload the reservations
      if (this.selectedEvenementForReservations) {
        this.loadReservationsForEvenement(this.selectedEvenementForReservations.id);
      }
    }
    this.closeStatusModal();
  }

  confirmReservation(reservationId: number): void {
    this.reservationService.confirmer(reservationId).subscribe({
      next: () => {
        // Reload reservations after confirmation
        if (this.selectedEvenementForReservations) {
          this.loadReservationsForEvenement(this.selectedEvenementForReservations.id);
        }
      },
      error: (err) => {
        console.error('Error confirming reservation:', err);
        this.reservationsError = 'Failed to confirm reservation';
      }
    });
  }

  cancelReservation(reservationId: number): void {
    this.reservationService.annuler(reservationId).subscribe({
      next: () => {
        // Reload reservations after cancellation
        if (this.selectedEvenementForReservations) {
          this.loadReservationsForEvenement(this.selectedEvenementForReservations.id);
        }
      },
      error: (err) => {
        console.error('Error cancelling reservation:', err);
        this.reservationsError = 'Failed to cancel reservation';
      }
    });
  }

  /**
   * Mark a reservation as already used
   */
  markAsAlreadyUsed(reservationId: number): void {
    this.reservationService.markAsAlreadyUsed(reservationId).subscribe({
      next: () => {
        // Reload reservations after marking as used
        if (this.selectedEvenementForReservations) {
          this.loadReservationsForEvenement(this.selectedEvenementForReservations.id);
        }
      },
      error: (err) => {
        console.error('Error marking reservation as used:', err);
        this.reservationsError = 'Failed to mark reservation as used';
      }
    });
  }
}
