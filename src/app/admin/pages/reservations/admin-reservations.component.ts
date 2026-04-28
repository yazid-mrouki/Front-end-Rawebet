import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReservationMaterielService } from '../../../features/material/services/reservation-materiel.service';
import { MaterielService } from '../../../features/material/services/materiel.service';
import { ReservationMateriel, ReservationStatus, ReservationMaterielRequestDTO, ExtendReservationMaterielRequestDTO, RetourPartielRequestDTO } from '../../../features/material/models/reservation-materiel.model';
import { Materiel } from '../../../features/material/models/materiel.model';

type ModalStep = 'list' | 'create' | 'extend' | 'retour';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reservations.component.html'
})
export class AdminReservationsComponent implements OnInit, OnDestroy {

  // ── List management ──────────────────────────────
  reservations: ReservationMateriel[] = [];
  materiels: Materiel[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';
  selectedStatusFilter = 'all';

  // ── Modal state ──––──────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'list';
  isSubmitting = false;
  errorMessage = '';
  selectedReservation: ReservationMateriel | null = null;

  // ── Form state ───────────────────────────────────
  formUserId = 0;
  formMaterielId = 0;
  formQuantite = 0;
  formDateDebut = '';
  formDateFin = '';
  extendNewDate = '';
  retourQuantite = 0;

  // ── Search subject ───────────────────────────────
  searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Status enum ──────────────────────────────────
  statusOptions = Object.values(ReservationStatus);

  constructor(
    private reservationService: ReservationMaterielService,
    private materielService: MaterielService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReservations();
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
  loadReservations(): void {
    this.isLoading = true;
    this.reservationService.getAll().subscribe({
      next: (data) => {
        this.reservations = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load reservations.';
        this.isLoading = false;
        this.cdr.detectChanges();
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
  get filteredReservations(): ReservationMateriel[] {
    return this.reservations.filter(res => {
      const matchSearch = res.materielNom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         res.userNom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         res.materielReference.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.selectedStatusFilter === 'all' || res.statut === this.selectedStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  // ── Modal Management ─────────────────────────────
  openCreateModal(): void {
    this.formUserId = 0;
    this.formMaterielId = 0;
    this.formQuantite = 0;
    this.formDateDebut = '';
    this.formDateFin = '';
    this.selectedReservation = null;
    this.modalStep = 'create';
    this.showModal = true;
    this.errorMessage = '';
  }

  openExtendModal(reservation: ReservationMateriel): void {
    this.selectedReservation = reservation;
    this.extendNewDate = reservation.dateFin;
    this.modalStep = 'extend';
    this.showModal = true;
    this.errorMessage = '';
  }

  openRetourModal(reservation: ReservationMateriel): void {
    this.selectedReservation = reservation;
    this.retourQuantite = reservation.quantite;
    this.modalStep = 'retour';
    this.showModal = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.modalStep = 'list';
    this.formUserId = 0;
    this.formMaterielId = 0;
    this.formQuantite = 0;
    this.formDateDebut = '';
    this.formDateFin = '';
    this.extendNewDate = '';
    this.retourQuantite = 0;
    this.selectedReservation = null;
    this.errorMessage = '';
  }

  // ── Create Reservation ───────────────────────────
  createReservation(): void {
    if (!this.validateCreateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const dto: ReservationMaterielRequestDTO = {
      userId: this.formUserId,
      materielId: this.formMaterielId,
      quantite: this.formQuantite,
      dateDebut: this.formDateDebut,
      dateFin: this.formDateFin
    };

    this.reservationService.reserver(dto).subscribe({
      next: (newReservation) => {
        this.reservations.push(newReservation as ReservationMateriel);
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating reservation:', err);
        this.errorMessage = err.error?.message || err.error?.error || 'Failed to create reservation.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Extend Reservation ───────────────────────────
  extendReservation(): void {
    if (!this.selectedReservation || !this.extendNewDate) {
      this.errorMessage = 'Please select a new end date.';
      return;
    }

    const newDate = new Date(this.extendNewDate);
    const currentEndDate = new Date(this.selectedReservation.dateFin);

    if (newDate <= currentEndDate) {
      this.errorMessage = 'New date must be after current end date.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.reservationService.extend(this.selectedReservation.id, this.extendNewDate).subscribe({
      next: (updated) => {
        const index = this.reservations.findIndex(r => r.id === this.selectedReservation!.id);
        if (index !== -1) {
          this.reservations[index] = updated as ReservationMateriel;
        }
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error extending reservation:', err);
        this.errorMessage = err.error?.message || err.error?.error || 'Failed to extend reservation.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Partial Return ───────────────────────────────
  partialReturn(): void {
    if (!this.selectedReservation || this.retourQuantite <= 0) {
      this.errorMessage = 'Please enter a valid return quantity.';
      return;
    }

    if (this.retourQuantite > this.selectedReservation.quantite) {
      this.errorMessage = `Return quantity cannot exceed reserved quantity (${this.selectedReservation.quantite}).`;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.reservationService.retourPartiel(this.selectedReservation.id, this.retourQuantite).subscribe({
      next: (updated) => {
        const index = this.reservations.findIndex(r => r.id === this.selectedReservation!.id);
        if (index !== -1) {
          this.reservations[index] = updated as ReservationMateriel;
        }
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error processing partial return:', err);
        this.errorMessage = err.error?.message || err.error?.error || 'Failed to process return.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Status Actions ───────────────────────────────
  confirmReservation(reservation: ReservationMateriel): void {
    this.reservationService.confirmer(reservation.id).subscribe({
      next: (updated) => {
        const index = this.reservations.findIndex(r => r.id === reservation.id);
        if (index !== -1) {
          this.reservations[index] = updated as ReservationMateriel;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error confirming reservation:', err);
        alert('Failed to confirm reservation.');
      }
    });
  }

  cancelReservation(reservation: ReservationMateriel): void {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    this.reservationService.annuler(reservation.id).subscribe({
      next: (updated) => {
        const index = this.reservations.findIndex(r => r.id === reservation.id);
        if (index !== -1) {
          this.reservations[index] = updated as ReservationMateriel;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cancelling reservation:', err);
        alert('Failed to cancel reservation.');
      }
    });
  }

  deleteReservation(id: number): void {
    if (!confirm('Are you sure you want to delete this reservation?')) {
      return;
    }

    this.reservationService.delete(id).subscribe({
      next: () => {
        this.reservations = this.reservations.filter(r => r.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting reservation:', err);
        alert('Failed to delete reservation.');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────
  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-600';
      case 'CONFIRMED': return 'bg-green-50 text-green-600';
      case 'CANCELLED': return 'bg-red-50 text-red-600';
      case 'COMPLETED': return 'bg-blue-50 text-blue-600';
      case 'RETURNED_PARTIAL': return 'bg-orange-50 text-orange-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getMaterielName(materielId: number): string {
    return this.materiels.find(m => m.id === materielId)?.nom || 'Unknown';
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  getCurrentDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  private validateCreateForm(): boolean {
    if (this.formUserId <= 0) {
      this.errorMessage = 'Please select a user.';
      return false;
    }
    if (this.formMaterielId <= 0) {
      this.errorMessage = 'Please select a material.';
      return false;
    }
    if (this.formQuantite <= 0) {
      this.errorMessage = 'Quantity must be greater than 0.';
      return false;
    }
    if (!this.formDateDebut) {
      this.errorMessage = 'Start date is required.';
      return false;
    }
    if (!this.formDateFin) {
      this.errorMessage = 'End date is required.';
      return false;
    }

    const startDate = new Date(this.formDateDebut);
    const endDate = new Date(this.formDateFin);
    const now = new Date();

    if (startDate <= now) {
      this.errorMessage = 'Start date must be in the future.';
      return false;
    }

    if (endDate <= startDate) {
      this.errorMessage = 'End date must be after start date.';
      return false;
    }

    return true;
  }

  onStatusFilterChange(): void {
    this.cdr.detectChanges();
  }
}
