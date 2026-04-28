import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CreateReservationCinemaRequest,
  ReservationCinemaEntity,
  UpdateReservationCinemaRequest,
} from '../../../core/models/reservation-cinema.model';
import { SeanceResponse } from '../../../core/models/seance.model';
import { ReservationCinemaService } from '../../../core/services/reservation-cinema.service';
import { SeatOption, SeatService } from '../../../core/services/seat.service';
import { SeanceService } from '../../../core/services/seance.service';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-tickets.component.html'
})
export class AdminTicketsComponent implements OnInit {
  searchQuery = '';
  reservations: ReservationCinemaEntity[] = [];
  seances: SeanceResponse[] = [];
  seats: SeatOption[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  formErrorMessage = '';
  editMode = false;

  createForm: CreateReservationCinemaRequest = {
    userId: 0,
    seanceId: 0,
    seatNumero: 0,
  };

  updateForm: UpdateReservationCinemaRequest = {
    id: 0,
    dateReservation: '',
    statut: 'PENDING',
    userId: 0,
    seanceId: 0,
    seatId: 0,
    paiementId: null,
  };

  constructor(
    private readonly reservationCinemaService: ReservationCinemaService,
    private readonly seatService: SeatService,
    private readonly seanceService: SeanceService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  get filteredReservations(): ReservationCinemaEntity[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return this.reservations;
    }

    return this.reservations.filter((item) =>
      item.id.toString().includes(query)
      || (item.user?.id?.toString() ?? '').includes(query)
      || (item.seat?.id?.toString() ?? '').includes(query)
      || (item.statut ?? '').toLowerCase().includes(query)
      || this.getSeanceLabel(item.seance?.id).toLowerCase().includes(query)
    );
  }

  loadAll(): void {
    this.loading = true;
    this.resetMessages();

    this.seanceService.getAll().subscribe({
      next: (data) => {
        this.seances = data;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les seances.';
      },
    });

    this.reservationCinemaService.getAll().subscribe({
      next: (data) => {
        this.reservations = data;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error ?? 'Impossible de charger les reservations.';
      },
    });
  }

  addReservation(): void {
    if (!this.isCreateFormValid()) {
      this.formErrorMessage = 'Renseigne userId, seanceId et choisis un siege.';
      return;
    }

    this.resetMessages();
    this.reservationCinemaService.add(this.createForm).subscribe({
      next: () => {
        this.successMessage = 'Reservation ajoutee avec succes.';
        this.createForm = { userId: 0, seanceId: 0, seatNumero: 0 };
        this.seats = [];
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? "Erreur lors de l'ajout de la reservation.";
      },
    });
  }

  startEdit(reservation: ReservationCinemaEntity): void {
    this.resetMessages();
    this.editMode = true;
    this.updateForm = {
      id: reservation.id,
      dateReservation: reservation.dateReservation ?? '',
      statut: reservation.statut ?? 'PENDING',
      userId: reservation.user?.id ?? 0,
      seanceId: reservation.seance?.id ?? 0,
      seatId: reservation.seat?.id ?? 0,
      paiementId: reservation.paiement?.id ?? null,
    };
  }

  updateReservation(): void {
    if (!this.isUpdateFormValid()) {
      this.formErrorMessage = 'Renseigne tous les champs obligatoires.';
      return;
    }

    this.resetMessages();
    this.reservationCinemaService.update(this.updateForm).subscribe({
      next: () => {
        this.successMessage = 'Reservation mise a jour avec succes.';
        this.cancelEdit();
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Erreur lors de la mise a jour de la reservation.';
      },
    });
  }

  deleteReservation(id: number): void {
    this.resetMessages();
    this.reservationCinemaService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Reservation supprimee avec succes.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Erreur lors de la suppression de la reservation.';
      },
    });
  }

  cancelEdit(): void {
    this.editMode = false;
    this.formErrorMessage = '';
    this.updateForm = {
      id: 0,
      dateReservation: '',
      statut: 'PENDING',
      userId: 0,
      seanceId: 0,
      seatId: 0,
      paiementId: null,
    };
  }

  onCreateSeanceChange(seanceId: number): void {
    this.createForm.seanceId = Number(seanceId) || 0;
    this.createForm.seatNumero = 0;
    this.loadSeatsForSeance(this.createForm.seanceId);
  }

  getSeanceLabel(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return '-';
    }

    const seance = this.seances.find((item) => item.id === seanceId);
    return seance ? `#${seance.id} - ${seance.dateHeure}` : `#${seanceId}`;
  }

  getStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-50 text-green-600';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700';
      case 'CANCELLED':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  private isCreateFormValid(): boolean {
    return this.createForm.userId > 0
      && this.createForm.seanceId > 0
      && this.createForm.seatNumero > 0;
  }

  private isUpdateFormValid(): boolean {
    return this.updateForm.id > 0
      && this.updateForm.userId > 0
      && this.updateForm.seanceId > 0
      && this.updateForm.seatId > 0
      && this.updateForm.statut.trim().length > 0;
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.formErrorMessage = '';
  }

  private loadSeatsForSeance(seanceId: number): void {
    if (seanceId <= 0) {
      this.seats = [];
      return;
    }

    this.seatService.getSeatsBySeance(seanceId).subscribe({
      next: (seats) => {
        this.seats = seats;
      },
      error: () => {
        this.seats = [];
        this.errorMessage = this.errorMessage || 'Impossible de charger les sieges pour cette seance.';
      },
    });
  }
}
