import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
  CancellationPredictionResult,
  CancellationPredictionTicketInput,
} from '../../../core/models/cancellation-prediction.model';
import {
  CreateReservationCinemaRequest,
  ReservationCinemaEntity,
  UpdateReservationCinemaRequest,
} from '../../../core/models/reservation-cinema.model';
import { SeanceResponse } from '../../../core/models/seance.model';
import { UserResponse } from '../../../core/models/user.model';
import { ReservationCinemaService } from '../../../core/services/reservation-cinema.service';
import { CancellationPredictionService } from '../../../core/services/cancellation-prediction.service';
import { SeatOption, SeatService } from '../../../core/services/seat.service';
import { SeanceService } from '../../../core/services/seance.service';
import { UserService } from '../../../core/services/user.service';

type TicketFormMode = 'create' | 'edit';
type SortField = 'id' | 'user' | 'seance' | 'status' | 'date' | 'risk';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-tickets.component.html'
})
export class AdminTicketsComponent implements OnInit {
  Math = Math;
  searchQuery = '';
  statusFilter = '';
  reservations: ReservationCinemaEntity[] = [];
  seances: SeanceResponse[] = [];
  seats: SeatOption[] = [];
  users: UserResponse[] = [];
  seatNumbersById: Record<number, number> = {};
  cancellationPredictions: Record<number, CancellationPredictionResult> = {};
  loading = false;
  predictionLoading = false;
  errorMessage = '';
  successMessage = '';
  formErrorMessage = '';
  predictionErrorMessage = '';
  editMode = false;
  showCreateForm = false;
  createErrors: Record<string, string> = {};
  updateErrors: Record<string, string> = {};
  showDeleteDialog = false;
  reservationToDelete: ReservationCinemaEntity | null = null;
  
  // Pagination & Sorting
  currentPage = 1;
  pageSize = 10;
  sortField: SortField = 'id';
  sortOrder: SortOrder = 'desc';

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
    private readonly cancellationPredictionService: CancellationPredictionService,
    private readonly seatService: SeatService,
    private readonly seanceService: SeanceService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadAll();
  }

  // Statistics
  get stats() {
    const filtered = this.filteredReservations;
    return {
      total: filtered.length,
      confirmed: filtered.filter(r => r.statut === 'CONFIRMED').length,
      pending: filtered.filter(r => r.statut === 'PENDING').length,
      cancelled: filtered.filter(r => r.statut === 'CANCELLED').length,
    };
  }

  get predictionStats() {
    const predictions = Object.values(this.cancellationPredictions);
    const highRisk = predictions.filter((prediction) => prediction.riskLevel === 'HIGH');
    const mediumRisk = predictions.filter((prediction) => prediction.riskLevel === 'MEDIUM');
    const averageProbability = predictions.length
      ? predictions.reduce((sum, prediction) => sum + prediction.cancellationProbability, 0) / predictions.length
      : 0;

    return {
      totalScored: predictions.length,
      highRisk: highRisk.length,
      mediumRisk: mediumRisk.length,
      averageProbability,
    };
  }

  get topRiskReservations(): ReservationCinemaEntity[] {
    return [...this.reservations]
      .filter((ticket) => this.getPrediction(ticket) != null)
      .sort((left, right) => this.getPredictionProbabilityValue(right) - this.getPredictionProbabilityValue(left))
      .slice(0, 4);
  }

  get filteredReservations(): ReservationCinemaEntity[] {
    let filtered = this.reservations;

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toString().includes(query)
        || this.getUserDisplay(item).toLowerCase().includes(query)
        || this.getSeanceDisplay(item).toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(r => r.statut === this.statusFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      const aVal = this.getSortValue(a);
      const bVal = this.getSortValue(b);

      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  get paginatedReservations(): ReservationCinemaEntity[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredReservations.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredReservations.length / this.pageSize);
  }

  get visiblePageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1)
      .filter((page) => page >= this.currentPage - 1 && page <= this.currentPage + 1);
  }

  setSortField(field: SortField): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.currentPage = 1;
    this.sortField = 'id';
    this.sortOrder = 'desc';
  }

  loadAll(): void {
    this.loading = true;
    this.resetMessages();

    forkJoin({
      seances: this.seanceService.getAll().pipe(catchError(() => of([] as SeanceResponse[]))),
      reservations: this.reservationCinemaService.getAll().pipe(catchError(() => of([] as ReservationCinemaEntity[]))),
    }).subscribe({
      next: ({ seances, reservations }) => {
        this.seances = seances;
        this.reservations = reservations;
        this.loadCancellationPredictions(reservations);
        this.preloadSeatNumbers(reservations);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load reservations.';
      },
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers(0, 200).pipe(
      map((page) => (page.content ?? []) as UserResponse[]),
      catchError(() => of([] as UserResponse[]))
    ).subscribe({
      next: (users) => {
        this.users = users;
        this.cdr.detectChanges();
      }
    });
  }

  addReservation(form: NgForm): void {
    form.control.markAllAsTouched();
    this.createErrors = {};

    if (!this.validateCreateForm()) {
      return;
    }

    this.resetMessages();
    this.reservationCinemaService.add(this.createForm).subscribe({
      next: () => {
        this.successMessage = 'Reservation added successfully.';
        this.showCreateForm = false;
        this.createForm = { userId: 0, seanceId: 0, seatNumero: 0 };
        this.seats = [];
        form.resetForm({ userId: 0, seanceId: 0, seatNumero: 0 });
        this.loadAll();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? "Error while adding reservation.";
      },
    });
  }

  startEdit(reservation: ReservationCinemaEntity): void {
    this.resetMessages();
    this.showCreateForm = false;
    this.editMode = true;
    this.updateErrors = {};

    const reservationUserId = this.extractUserId(reservation);
    const reservationSeanceId = this.extractSeanceId(reservation);

    this.updateForm = {
      id: reservation.id,
      dateReservation: reservation.dateReservation ?? '',
      statut: reservation.statut ?? 'PENDING',
      userId: reservationUserId,
      seanceId: reservationSeanceId,
      seatId: reservation.seat?.id ?? reservation.seatId ?? 0,
      paiementId: reservation.paiement?.id ?? reservation.paiementId ?? null,
    };

    this.loadSeatsForSeance(reservationSeanceId);
  }

  updateReservation(form: NgForm): void {
    form.control.markAllAsTouched();
    this.updateErrors = {};

    if (!this.validateUpdateForm()) {
      return;
    }

    this.resetMessages();
    this.reservationCinemaService.update(this.updateForm).subscribe({
      next: () => {
        this.successMessage = 'Reservation updated successfully.';
        this.cancelEdit(form);
        this.loadAll();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Error while updating reservation.';
      },
    });
  }

  deleteReservation(id: number): void {
    this.resetMessages();
    this.reservationCinemaService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Reservation deleted successfully.';
        this.loadAll();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Error while deleting reservation.';
      },
    });
  }

  openDeleteDialog(reservation: ReservationCinemaEntity): void {
    this.reservationToDelete = reservation;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.reservationToDelete = null;
  }

  confirmDelete(): void {
    if (!this.reservationToDelete) {
      return;
    }

    const reservationId = this.reservationToDelete.id;
    this.closeDeleteDialog();
    this.deleteReservation(reservationId);
  }

  cancelEdit(form?: NgForm): void {
    this.editMode = false;
    this.formErrorMessage = '';
    this.updateErrors = {};
    this.updateForm = {
      id: 0,
      dateReservation: '',
      statut: 'PENDING',
      userId: 0,
      seanceId: 0,
      seatId: 0,
      paiementId: null,
    };
    this.seats = [];
    form?.resetForm(this.updateForm);
  }

  openCreateForm(): void {
    this.resetMessages();
    this.editMode = false;
    this.showCreateForm = true;
    this.createErrors = {};
    this.createForm = { userId: 0, seanceId: 0, seatNumero: 0 };
    this.seats = [];
  }

  cancelCreate(form?: NgForm): void {
    this.showCreateForm = false;
    this.createErrors = {};
    this.createForm = { userId: 0, seanceId: 0, seatNumero: 0 };
    this.seats = [];
    form?.resetForm(this.createForm);
  }

  onCreateSeanceChange(seanceId: number): void {
    this.createForm.seanceId = Number(seanceId) || 0;
    this.createForm.seatNumero = 0;
    this.createErrors['seanceId'] = '';
    this.createErrors['seatNumero'] = '';
    this.loadSeatsForSeance(this.createForm.seanceId);
  }

  onEditSeanceChange(seanceId: number): void {
    this.updateForm.seanceId = Number(seanceId) || 0;
    this.updateForm.seatId = 0;
    this.updateErrors['seanceId'] = '';
    this.updateErrors['seatId'] = '';
    this.loadSeatsForSeance(this.updateForm.seanceId);
  }

  getUserDisplay(ticket: ReservationCinemaEntity): string {
    const ticketUser = ticket.user as any;
    const userId = this.extractUserId(ticket);
    const resolvedUser = this.users.find((user) => user.id === userId);
    const fullName = ticketUser?.fullName || ticketUser?.nomComplet || resolvedUser?.['fullName' as keyof UserResponse];
    const name = ticketUser?.nom || ticketUser?.name || resolvedUser?.nom;
    const username = ticketUser?.username || ticketUser?.userName || (resolvedUser as any)?.username;
    const email = ticketUser?.email || resolvedUser?.email;

    if (fullName) return String(fullName);
    if (name) return name;
    if (username) return username;
    if (email) return email;
    if (userId > 0) return `User #${userId}`;
    return '-';
  }

  getSeanceDisplay(ticket: ReservationCinemaEntity): string {
    const seance = this.getTicketSeance(ticket);
    const seanceId = this.extractSeanceId(ticket);
    if (!seance) {
      return seanceId > 0 ? `Showtime #${seanceId}` : '-';
    }

    const filmTitle = this.getSeanceFilmTitle(seance);
    const dateTime = this.formatDateTime(seance.dateHeure);
    if (filmTitle !== 'Movie unavailable' && dateTime !== '-') {
      return `${filmTitle} - ${dateTime}`;
    }
    return seanceId > 0 ? `Showtime #${seanceId}` : 'Showtime unavailable';
  }

  getSeatDisplay(ticket: ReservationCinemaEntity): string {
    const seat = ticket.seat as any;
    const seatNumber = seat?.seatNumber ?? seat?.numero ?? seat?.seat_number ?? this.extractSeatNumberFromLabel(seat?.fullLabel ?? seat?.label);
    if (seatNumber != null) {
      return `Seat ${seatNumber}`;
    }

    const seatId = seat?.id ?? ticket.seatId ?? 0;
    const mappedSeatNumber = seatId > 0 ? this.seatNumbersById[seatId] : undefined;
    if (mappedSeatNumber != null) {
      return `Seat ${mappedSeatNumber}`;
    }

    if (seatId > 0) {
      return `Seat #${seatId}`;
    }
    return '-';
  }

  getPaiementDisplay(ticket: ReservationCinemaEntity): string {
    const paiement = ticket.paiement as any;
    if (!paiement && !ticket.paiementId) {
      return '-';
    }

    const reference = paiement?.reference || paiement?.ref || paiement?.numeroReference;
    if (reference) {
      return String(reference);
    }

    const amount = paiement?.montant ?? paiement?.amount;
    if (amount != null) {
      return `${amount} TND`;
    }

    const paiementId = paiement?.id ?? ticket.paiementId ?? 0;
    if (paiementId > 0) {
      return `Payment #${paiementId}`;
    }
    return '-';
  }

  getSeanceLabel(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return 'Choose a showtime';
    }

    const seance = this.seances.find((item) => item.id === seanceId);
    if (!seance) {
      return `Showtime #${seanceId}`;
    }

    return `${this.getSeanceFilmTitle(seance)} - ${this.formatDateTime(seance.dateHeure)}`;
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

  getStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  getPrediction(ticket: ReservationCinemaEntity): CancellationPredictionResult | null {
    return this.cancellationPredictions[ticket.id] ?? null;
  }

  getPredictionRiskLabel(ticket: ReservationCinemaEntity): string {
    const prediction = this.getPrediction(ticket);
    if (!prediction) {
      return this.predictionLoading ? 'Analyzing...' : '-';
    }

    switch (prediction.riskLevel) {
      case 'HIGH':
        return 'High risk';
      case 'MEDIUM':
        return 'Medium risk';
      default:
        return 'Low risk';
    }
  }

  getPredictionRiskClass(ticket: ReservationCinemaEntity): string {
    const prediction = this.getPrediction(ticket);
    if (!prediction) {
      return 'bg-slate-700 text-slate-300';
    }

    switch (prediction.riskLevel) {
      case 'HIGH':
        return 'bg-red-500/20 text-red-300';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300';
      default:
        return 'bg-emerald-500/20 text-emerald-300';
    }
  }

  getPredictionProbability(ticket: ReservationCinemaEntity): string {
    const probability = this.getPrediction(ticket)?.cancellationProbability;
    return typeof probability === 'number' ? `${Math.round(probability * 100)}%` : '-';
  }

  getPredictionAction(ticket: ReservationCinemaEntity): string {
    return this.getPrediction(ticket)?.recommendedAction ?? '';
  }

  showFieldError(control: NgModel | null | undefined, field: string, form: NgForm, mode: TicketFormMode): boolean {
    return Boolean(this.getFieldError(mode, field)) && Boolean(control?.touched || form.submitted);
  }

  getFieldError(mode: TicketFormMode, field: string): string {
    return mode === 'create'
      ? (this.createErrors[field] ?? '')
      : (this.updateErrors[field] ?? '');
  }

  getFieldClasses(showError: boolean): string {
    return showError
      ? 'border-red-400 bg-red-500/10 text-white focus:border-red-300 focus:ring-2 focus:ring-red-500/20'
      : 'border-slate-600 bg-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
  }

  getSeatOptionLabel(seat: SeatOption): string {
    const seatNumber = seat?.seatNumber ?? this.extractSeatNumberFromLabel((seat as any)?.fullLabel ?? (seat as any)?.label);
    if (seatNumber != null) {
      return `Seat ${seatNumber}`;
    }

    const fullLabel = (seat as any)?.fullLabel ?? (seat as any)?.label;
    if (fullLabel) {
      return String(fullLabel);
    }

    return `Seat #${seat.id}`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  getUserOptionLabel(user: UserResponse): string {
    const fullName = (user as any)?.fullName || (user as any)?.nomComplet;
    const name = (user as any)?.nom || (user as any)?.name;
    const username = (user as any)?.username || (user as any)?.userName;
    const email = user?.email;

    return fullName || name || username || email || `User #${user.id}`;
  }

  private validateCreateForm(): boolean {
    this.createErrors = {};

    if (!this.createForm.userId || this.createForm.userId <= 0) {
      this.createErrors['userId'] = "User is required.";
    }

    if (!this.createForm.seanceId || this.createForm.seanceId <= 0) {
      this.createErrors['seanceId'] = 'Showtime is required.';
    }

    if (!this.createForm.seatNumero || Number(this.createForm.seatNumero) <= 0) {
      this.createErrors['seatNumero'] = 'Seat is required.';
    }

    return Object.keys(this.createErrors).length === 0;
  }

  private validateUpdateForm(): boolean {
    this.updateErrors = {};

    if (!this.updateForm.userId || this.updateForm.userId <= 0) {
      this.updateErrors['userId'] = "User is required.";
    }

    if (!this.updateForm.seanceId || this.updateForm.seanceId <= 0) {
      this.updateErrors['seanceId'] = 'Showtime is required.';
    }

    if (!this.updateForm.seatId || this.updateForm.seatId <= 0) {
      this.updateErrors['seatId'] = 'Seat is required.';
    }

    if (!this.updateForm.statut || this.updateForm.statut.trim() === '') {
      this.updateErrors['statut'] = 'Status is required.';
    }

    return Object.keys(this.updateErrors).length === 0;
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.formErrorMessage = '';
    this.predictionErrorMessage = '';
  }

  private loadSeatsForSeance(seanceId: number): void {
    if (seanceId <= 0) {
      this.seats = [];
      return;
    }

    this.seatService.getSeatsBySeance(seanceId).subscribe({
      next: (seats) => {
        this.seats = this.normalizeSeats(seats);
        this.cdr.detectChanges();
      },
      error: () => {
        this.seats = [];
        this.errorMessage = this.errorMessage || 'Unable to load seats for this showtime.';
      },
    });
  }

  private preloadSeatNumbers(reservations: ReservationCinemaEntity[]): void {
    const seanceIds = [...new Set(
      reservations
        .map((reservation) => this.extractSeanceId(reservation))
        .filter((id): id is number => typeof id === 'number' && id > 0)
    )];

    if (seanceIds.length === 0) {
      this.seatNumbersById = {};
      return;
    }

    forkJoin(
      seanceIds.map((seanceId) =>
        this.seatService.getSeatsBySeance(seanceId).pipe(
          catchError(() => of([] as SeatOption[]))
        )
      )
    ).subscribe({
      next: (seatGroups) => {
        const seatMap: Record<number, number> = {};
        seatGroups.flatMap((group) => this.normalizeSeats(group)).forEach((seat) => {
          if (seat?.id != null && seat?.seatNumber != null) {
            seatMap[seat.id] = seat.seatNumber;
          }
        });
        this.seatNumbersById = seatMap;
      },
      error: () => {
        this.seatNumbersById = {};
      },
    });
  }

  private getTicketSeance(ticket: ReservationCinemaEntity): SeanceResponse | null {
    if (ticket.seance) {
      return ticket.seance;
    }

    const seanceId = this.extractSeanceId(ticket);
    if (!seanceId) {
      return null;
    }

    return this.seances.find((seance) => seance.id === seanceId) ?? null;
  }

  private getSeanceFilmTitle(seance: SeanceResponse | null | undefined): string {
    if (!seance) {
      return 'Movie unavailable';
    }

    const film = (seance as any).film;
    return (seance as any).filmTitle || film?.title || film?.titre || 'Movie unavailable';
  }

  private extractUserId(ticket: ReservationCinemaEntity): number {
    return Number((ticket as any).userId ?? ticket.user?.id ?? 0);
  }

  private extractSeanceId(ticket: ReservationCinemaEntity): number {
    return Number(ticket.seance?.id ?? ticket.seanceId ?? 0);
  }

  private resolveSeatNumber(ticket: ReservationCinemaEntity): number | null {
    const seat = ticket.seat as any;
    const directSeatNumber =
      seat?.seatNumber ??
      seat?.numero ??
      seat?.seat_number ??
      this.extractSeatNumberFromLabel(seat?.fullLabel ?? seat?.label);

    if (directSeatNumber != null && !Number.isNaN(Number(directSeatNumber))) {
      return Number(directSeatNumber);
    }

    const seatId = seat?.id ?? ticket.seatId ?? 0;
    const mappedSeatNumber = seatId > 0 ? this.seatNumbersById[seatId] : undefined;
    return mappedSeatNumber != null ? Number(mappedSeatNumber) : null;
  }

  private loadCancellationPredictions(reservations: ReservationCinemaEntity[]): void {
    if (!reservations.length) {
      this.cancellationPredictions = {};
      return;
    }

    this.predictionLoading = true;
    this.predictionErrorMessage = '';

    const payload: CancellationPredictionTicketInput[] = reservations.map((ticket) =>
      this.buildPredictionPayload(ticket, reservations)
    );

    this.cancellationPredictionService.predictBatch({ tickets: payload }).subscribe({
      next: (response) => {
        this.cancellationPredictions = response.predictions.reduce<Record<number, CancellationPredictionResult>>(
          (accumulator, prediction) => {
            accumulator[prediction.reservationId] = prediction;
            return accumulator;
          },
          {}
        );
        this.predictionLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cancellationPredictions = {};
        this.predictionLoading = false;
        this.predictionErrorMessage = "The AI service is currently unavailable.";
        this.cdr.detectChanges();
      },
    });
  }

  private buildPredictionPayload(
    ticket: ReservationCinemaEntity,
    reservations: ReservationCinemaEntity[],
  ): CancellationPredictionTicketInput {
    const userId = this.extractUserId(ticket);
    const userReservations = reservations.filter((reservation) => this.extractUserId(reservation) === userId);
    const ticketDate = this.parseDate(ticket.dateReservation);
    const recentWindow = ticketDate ? new Date(ticketDate.getTime() - 30 * 24 * 60 * 60 * 1000) : null;
    const userRecentBookings30d = recentWindow
      ? userReservations.filter((reservation) => {
          const reservationDate = this.parseDate(reservation.dateReservation);
          return reservationDate != null && reservationDate >= recentWindow && reservationDate <= ticketDate!;
        }).length
      : userReservations.length;
    const userCancelledBookings = userReservations.filter((reservation) => reservation.statut === 'CANCELLED').length;
    const user = this.users.find((candidate) => candidate.id === userId);
    const seance = this.getTicketSeance(ticket);

    return {
      reservationId: ticket.id,
      userId,
      seanceId: this.extractSeanceId(ticket),
      dateReservation: ticket.dateReservation,
      seanceDateHeure: seance?.dateHeure ?? null,
      prixBase: seance?.prixBase ?? null,
      langue: seance?.langue ?? null,
      filmGenre: seance?.film?.genre ?? null,
      seatNumber: this.resolveSeatNumber(ticket),
      userTotalBookings: userReservations.length,
      userCancelledBookings,
      userRecentBookings30d,
      loyaltyLevel: user?.loyaltyLevel ?? this.inferLoyaltyLevel(userCancelledBookings, userReservations.length),
      loyaltyPoints: user?.loyaltyPoints ?? Math.max(0, userReservations.length * 35 - userCancelledBookings * 15),
      statut: ticket.statut,
    };
  }

  private inferLoyaltyLevel(cancelledBookings: number, totalBookings: number): string {
    if (totalBookings >= 12 && cancelledBookings <= 2) {
      return 'GOLD';
    }
    if (totalBookings >= 6) {
      return 'SILVER';
    }
    return 'BRONZE';
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private normalizeSeats(response: any): SeatOption[] {
    const rawSeats = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.results)
            ? response.results
            : [];

    return rawSeats
      .filter((seat: any) => seat && seat.id != null)
      .map((seat: any) => {
        const seatNumber = seat.seatNumber ?? seat.numero ?? seat.seat_number ?? this.extractSeatNumberFromLabel(seat.fullLabel ?? seat.label);
        return {
          id: Number(seat.id),
          fullLabel: seat.fullLabel ?? seat.label ?? '',
          seatNumber: seatNumber != null ? Number(seatNumber) : 0,
          seatType: seat.seatType ?? seat.type ?? '',
          isActive: seat.isActive ?? seat.active ?? null,
        } satisfies SeatOption;
      });
  }

  private extractSeatNumberFromLabel(value: unknown): number | null {
    if (typeof value !== 'string') {
      return null;
    }

    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  private getSortValue(ticket: ReservationCinemaEntity): string | number {
    switch (this.sortField) {
      case 'user':
        return this.getUserDisplay(ticket).toLowerCase();
      case 'seance':
        return this.getSeanceDisplay(ticket).toLowerCase();
      case 'status':
        return (ticket.statut || '').toLowerCase();
      case 'date':
        return ticket.dateReservation || '';
      case 'risk':
        return this.getPredictionProbabilityValue(ticket);
      default:
        return ticket.id;
    }
  }

  getPredictionProbabilityValue(ticket: ReservationCinemaEntity): number {
    return this.getPrediction(ticket)?.cancellationProbability ?? -1;
  }

  getPredictionCardTone(tone: 'high' | 'medium' | 'average'): string {
    switch (tone) {
      case 'high':
        return 'from-rose-500/20 to-red-500/10 border-rose-400/30';
      case 'medium':
        return 'from-amber-400/20 to-orange-500/10 border-amber-300/30';
      default:
        return 'from-cyan-400/20 to-blue-500/10 border-cyan-300/30';
    }
  }

  getPredictionProgressWidth(ticket: ReservationCinemaEntity): string {
    return `${Math.max(0, Math.min(100, Math.round(this.getPredictionProbabilityValue(ticket) * 100)))}%`;
  }
}
