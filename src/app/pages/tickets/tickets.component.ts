import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import * as QRCode from 'qrcode';
import { AuthService } from '../../core/services/auth.service';
import { ReservationCinemaService } from '../../core/services/reservation-cinema.service';
import { SeatOption, SeatService } from '../../core/services/seat.service';
import { SeanceService } from '../../core/services/seance.service';
import { UserService } from '../../core/services/user.service';
import { UserResponse } from '../../core/models/user.model';
import {
  CreateReservationCinemaRequest,
  ReservationCinemaEntity,
  UpdateReservationCinemaRequest,
} from '../../core/models/reservation-cinema.model';
import { SeanceResponse } from '../../core/models/seance.model';

type TicketsTab = 'seances' | 'reservation' | 'my-tickets';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets.component.html'
})
export class TicketsComponent implements OnInit {
  activeTab: TicketsTab = 'seances';
  tickets: ReservationCinemaEntity[] = [];
  seances: SeanceResponse[] = [];
  seats: SeatOption[] = [];
  seatNumbersById: Record<number, number> = {};
  loading = false;
  seatsLoading = false;
  submitting = false;
  currentUser: UserResponse | null = null;
  currentUserId: number | null = null;
  currentUserLoading = false;
  currentUserLoaded = false;
  currentUserLoadFailed = false;
  errorMessage = '';
  successMessage = '';
  formErrorMessage = '';
  seatTakenMessage = '';
  editMode = false;
  selectedSeanceId: number | null = null;
  ticketQrCodes: Record<number, string> = {};

  createForm: CreateReservationCinemaRequest = {
    userId: 0,
    seanceId: 0,
    seatNumero: null as any,
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
    private readonly authService: AuthService,
    private readonly reservationCinemaService: ReservationCinemaService,
    private readonly seatService: SeatService,
    private readonly seanceService: SeanceService,
    private readonly userService: UserService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initializeCurrentUser();
    this.authService.authState.subscribe((authenticated) => {
      if (authenticated) {
        this.initializeCurrentUser();
      } else {
        this.resetState();
      }
    });
  }

  get myTickets(): ReservationCinemaEntity[] {
    if (this.tickets.length === 0) return [];
    const filtered = [...this.tickets]
      .filter((t) => {
        const ticketUserId = Number((t as any).userId ?? t.user?.id);
        return ticketUserId === this.currentUserId;
      })
      .filter((ticket) => !this.shouldHideCancelledDuplicate(ticket))
      .sort((a, b) => b.id - a.id);
    return filtered.length > 0 ? filtered : this.tickets.sort((a, b) => b.id - a.id);
  }

  get selectedSeance(): SeanceResponse | null {
    if (!this.selectedSeanceId) return null;
    return this.seances.find((s) => s.id === this.selectedSeanceId) ?? null;
  }

  get availableSeats(): SeatOption[] {
    const takenNums = this.tickets
      .filter((t) => (t.seance?.id ?? t.seanceId) === this.selectedSeanceId)
      .map((t) => this.resolveSeatNumber(t) ?? -1);
    return this.seats.filter((s) => !takenNums.includes(s.seatNumber));
  }

  isSeatTaken(seatNumero: number): boolean {
    return this.tickets.some((t) => {
      if ((t.seance?.id ?? t.seanceId) !== this.selectedSeanceId) return false;
      const num = this.resolveSeatNumber(t);
      return num === seatNumero;
    });
  }

  onSeatChange(seatNumero: number): void {
    const numSeat = Number(seatNumero);
    this.createForm.seatNumero = numSeat;
    if (this.isSeatTaken(numSeat)) {
      this.seatTakenMessage = 'Seat ' + numSeat + ' is already reserved for this showtime.';
    } else {
      this.seatTakenMessage = '';
    }
  }

  onEditSeatChange(seatId: number): void {
    this.updateForm.seatId = Number(seatId);
    const selectedSeat = this.seats.find((seat) => seat.id === this.updateForm.seatId);
    const selectedSeatNumber = selectedSeat?.seatNumber;
    if (selectedSeatNumber != null && this.isSeatTakenForEdit(selectedSeatNumber)) {
      this.seatTakenMessage = 'Seat ' + selectedSeatNumber + ' is already reserved for this showtime.';
      return;
    }
    this.seatTakenMessage = '';
  }

  onSelectedSeanceChange(seanceId: number | null): void {
    // Skip reload if the same showtime is selected
    if (seanceId === this.selectedSeanceId) return;
    
    this.submitting = false;
    if (seanceId == null || seanceId <= 0) {
      this.selectedSeanceId = null;
      this.createForm.seanceId = 0;
      this.createForm.seatNumero = null as any;
      this.seats = [];
      this.seatTakenMessage = '';
      return;
    }
    
    this.selectedSeanceId = seanceId;
    this.createForm.seanceId = seanceId;
    this.createForm.seatNumero = null as any;
    this.seatTakenMessage = '';
    // Reload seats only when the selected showtime changes
    this.loadSeatsForSeance(seanceId);
  }

  loadCurrentUser(): void {
    this.currentUserLoading = true;
    this.userService.getMe().subscribe({
      next: (user) => {
        this.applyCurrentUser(user);
        this.currentUserLoaded = true;
        this.currentUserLoading = false;
        this.loadAll();
      },
      error: () => {
        this.currentUserLoading = false;
        this.currentUserLoaded = false;
        this.currentUserLoadFailed = true;
        this.loadAll();
      },
    });
  }

  loadAll(preserveMessages = false): void {
    this.loading = true;
    if (!preserveMessages) {
      this.resetMessages();
    }
    const reservationRequest = this.currentUserId !== null
      ? this.reservationCinemaService.getByUserId(this.currentUserId)
      : this.reservationCinemaService.getAll();

    forkJoin({
      seances: this.seanceService.getAll().pipe(catchError(() => of([] as SeanceResponse[]))),
      reservations: reservationRequest.pipe(catchError(() => of([] as ReservationCinemaEntity[]))),
    })
      .subscribe({
        next: ({ seances, reservations }) => {
          this.seances = seances;
          this.tickets = reservations;
          this.preloadSeatNumbers(reservations);
          this.generateTicketQRCodes(reservations);

          if (seances.length > 0 && !this.selectedSeanceId) {
            this.selectedSeanceId = seances[0].id;
            this.createForm.seanceId = seances[0].id;
            this.createForm.seatNumero = null as any;
            this.seatTakenMessage = '';
            this.loadSeatsForSeance(seances[0].id);
            this.activeTab = 'reservation';
          } else {
            this.ensureReservationDataLoaded();
          }

          this.loading = false;

          if (seances.length === 0 && !this.errorMessage) {
            this.errorMessage = 'No showtime found.';
          }
        },
        error: () => {
          this.errorMessage = 'Unable to load data.';
          this.loading = false;
        },
      });
  }

  // Legacy autoSelectFirstSeance removed (no longer needed).

  openReservationForSeance(seance: SeanceResponse): void {
    this.resetMessages();
    this.submitting = false;
    this.editMode = false;
    this.selectedSeanceId = seance.id;
    this.seats = [];
    this.seatTakenMessage = '';
    this.createForm = {
      userId: this.currentUserId ?? 0,
      seanceId: seance.id,
      seatNumero: null as any,
    };
    this.activeTab = 'reservation';
    this.loadSeatsForSeance(seance.id);
  }

  openReservationTab(): void {
    this.resetMessages();
    this.submitting = false;
    this.activeTab = 'reservation';
    // Load data only if it is not already available
    if (!this.seances.length && !this.loading) {
      this.loadAll(true);
    }
    // Otherwise data is already available; no extra call needed
  }

  private ensureReservationDataLoaded(): void {
    // This method does not refetch data; it uses in-memory state
    // Safety guard to ensure there is a selected showtime
    if (!this.seances.length || this.selectedSeanceId) return;
    
    // If no showtime is selected, select the first one
    const firstSeanceId = this.seances[0]?.id;
    if (firstSeanceId && firstSeanceId !== this.selectedSeanceId) {
      this.selectedSeanceId = firstSeanceId;
      this.createForm.seanceId = firstSeanceId;
    }
  }

  loadSeatsForSeance(seanceId: number): void {
    // Load seats only if they are not already loaded for this showtime
    if (this.seatsLoading || (this.seats.length > 0 && this.selectedSeanceId === seanceId)) {
      return; // Seats are already loaded; skip extra request
    }

    this.seatsLoading = true;
    this.formErrorMessage = '';
    this.seats = [];
    this.seatService.getSeatsBySeance(seanceId).subscribe({
      next: (seats: SeatOption[]) => {
        this.seats = Array.isArray(seats) ? seats : [];
        this.seatsLoading = false;
      },
      error: () => {
        this.seats = [];
        this.seatsLoading = false;
        this.formErrorMessage = 'Unable to load seats.';
      },
    });
  }

  addTicket(form: NgForm): void {
    if (this.submitting) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.formErrorMessage = 'Please fix errors before submitting.';
      this.activeTab = 'reservation';
      return;
    }
    this.createForm.seanceId = this.selectedSeanceId ?? 0;
    if (!this.selectedSeanceId || this.selectedSeanceId <= 0) {
      this.formErrorMessage = 'Please select a valid showtime.';
      this.activeTab = 'reservation';
      return;
    }
    if (this.createForm.seatNumero === null || this.createForm.seatNumero === 0) {
      this.formErrorMessage = 'Please select a seat.';
      this.activeTab = 'reservation';
      return;
    }
    if (this.isSeatTaken(this.createForm.seatNumero)) {
      this.seatTakenMessage = 'Seat ' + this.createForm.seatNumero + ' is already reserved for this showtime.';
      this.formErrorMessage = 'This seat is already reserved for this showtime.';
      this.activeTab = 'reservation';
      return;
    }
    this.submitting = true;
    this.resetMessages();
    this.reservationCinemaService.add(this.createForm).subscribe({
      next: () => {
        form.resetForm();
        this.createForm.seatNumero = null as any;
        this.createForm.seanceId = this.selectedSeanceId ?? 0;
        this.submitting = false;
        this.editMode = false;
        this.refreshTicketsAfterMutation('Reservation completed successfully!');
      },
      error: (err: any) => {
        this.formErrorMessage = this.getReservationErrorMessage(err, 'Error while making reservation.');
        this.activeTab = 'reservation';
        this.submitting = false;
      },
    });
  }

  updateTicket(form: NgForm): void {
    if (this.submitting) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.formErrorMessage = 'Please fix errors before submitting.';
      return;
    }
    this.updateForm.seanceId = this.selectedSeanceId ?? this.updateForm.seanceId;
    if (!this.updateForm.seanceId || this.updateForm.seanceId <= 0) {
      this.formErrorMessage = 'Invalid showtime. Please refresh the page.';
      return;
    }
    const selectedSeat = this.seats.find((seat) => seat.id === this.updateForm.seatId);
    const selectedSeatNumber = selectedSeat?.seatNumber;
    if (selectedSeatNumber != null && this.isSeatTakenForEdit(selectedSeatNumber)) {
      this.seatTakenMessage = 'Seat ' + selectedSeatNumber + ' is already reserved for this showtime.';
      this.formErrorMessage = 'This seat is already reserved for this showtime.';
      this.submitting = false;
      return;
    }
    this.submitting = true;
    this.resetMessages();
    this.reservationCinemaService.update(this.updateForm).subscribe({
      next: () => {
        this.submitting = false;
        this.editMode = false;
        this.refreshTicketsAfterMutation('Ticket updated successfully!');
      },
      error: (err: any) => {
        this.formErrorMessage = this.getReservationErrorMessage(err, 'Error while updating.');
        this.submitting = false;
      },
    });
  }

  deleteTicket(ticket: ReservationCinemaEntity): void {
    if (!confirm(`Delete reservation for movie "${this.getFilmTitle(ticket)}" ?`)) return;
    this.reservationCinemaService.delete(ticket.id).subscribe({
      next: () => {
        this.editMode = false;
        this.refreshTicketsAfterMutation('Ticket deleted successfully!');
      },
      error: () => { this.errorMessage = 'Unable to delete this ticket.'; },
    });
  }

  startEdit(ticket: ReservationCinemaEntity): void {
    const seanceId = ticket.seance?.id ?? ticket.seanceId;
    if (!seanceId || seanceId <= 0) {
      this.formErrorMessage = 'Unable to edit this ticket: invalid showtime.';
      return;
    }
    this.editMode = true;
    this.selectedSeanceId = seanceId;
    this.updateForm = {
      id: ticket.id,
      dateReservation: ticket.dateReservation ?? '',
      statut: ticket.statut ?? 'PENDING',
      userId: this.currentUserId ?? 0,
      seanceId: seanceId,
      seatId: ticket.seat?.id ?? 0,
      paiementId: ticket.paiement?.id ?? null,
    };
    this.activeTab = 'reservation';
    this.loadSeatsForSeance(seanceId);
  }

  cancelEdit(): void {
    this.submitting = false;
    this.editMode = false;
    this.activeTab = 'my-tickets';
    this.resetMessages();
  }

  goToSeances(): void {
    this.submitting = false;
    this.activeTab = 'seances';
    this.editMode = false;
  }

  // Manual refresh method (called by the Refresh button)
  refreshSeances(): void {
    this.loadAll();
  }

  showFieldError(field: NgModel, form: NgForm): boolean {
    return !!(field.invalid && (field.dirty || field.touched || form.submitted));
  }

  getSeatErrorMessage(field: NgModel): string {
    if (field.errors?.['required']) return 'This field is required.';
    if (field.errors?.['min']) return 'Number must be greater than 0.';
    if (field.errors?.['max']) return 'Number is too large.';
    return 'Invalid value.';
  }

  getPaiementErrorMessage(field: NgModel): string {
    if (field.errors?.['min']) return 'Value must be positive.';
    if (field.errors?.['max']) return 'Value is too large.';
    return 'Invalid value.';
  }

  getSeanceDateTimeById(seanceId: number | null | undefined): string {
    return this.seances.find((s) => s.id === seanceId)?.dateHeure ?? '-';
  }

  getDisplayedSeatNumber(ticket: ReservationCinemaEntity): string {
    const num = this.resolveSeatNumber(ticket);
    return num != null ? String(num) : '-';
  }

  getTicketSeance(ticket: ReservationCinemaEntity): SeanceResponse | null {
    if (ticket.seance) return ticket.seance;
    if (ticket.seanceId != null) {
      return this.seances.find((s) => s.id === ticket.seanceId) ?? null;
    }
    return null;
  }

  getFilmTitle(ticket: ReservationCinemaEntity): string {
    const seance = this.getTicketSeance(ticket);
    if (!seance) return 'Movie unavailable';
    if ((seance as any).filmTitle) return (seance as any).filmTitle;
    const film = (seance as any)?.film;
    if (film && film.titre) return film.titre;
    if (film && film.title) return film.title;
    return 'Movie unavailable';
  }

  getSeanceFilmTitle(seance: SeanceResponse | null | undefined): string {
    if (!seance) return 'Movie unavailable';
    return (seance as any).filmTitle || seance.film?.title || 'Movie unavailable';
  }

  getSeanceFilmGenre(seance: SeanceResponse | null | undefined): string {
    if (!seance) return '-';
    return seance.film?.genre || '-';
  }

  getSeanceFilmDuration(seance: SeanceResponse | null | undefined): string {
    if (!seance) return '-';
    const duration = seance.film?.durationMinutes;
    return duration != null ? String(duration) : '-';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date);
  }

  getTicketSeanceDateTime(ticket: ReservationCinemaEntity): string {
    return this.getTicketSeance(ticket)?.dateHeure ?? this.getSeanceDateTimeById(ticket.seanceId);
  }

  getStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'CANCELLED': return 'Cancelled';
      case 'PENDING': return 'Pending';
      default: return 'Pending';
    }
  }

  getStatusClasses(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-50 text-green-700';
      case 'CANCELLED': return 'bg-red-50 text-red-600';
      default: return 'bg-amber-50 text-amber-700';
    }
  }

  getTicketQrSummary(ticket: ReservationCinemaEntity): string {
    const lines = [
      'RAWABET CINEMA',
      `Reservation #${ticket.id}`,
      `Movie: ${this.getFilmTitle(ticket)}`,
      `Showtime: ${this.formatDateTime(this.getTicketSeanceDateTime(ticket))}`,
      `Seat: ${this.getDisplayedSeatNumber(ticket)}`,
      `Reserved on: ${this.formatDate(ticket.dateReservation)}`,
      `Status: ${this.getStatusLabel(ticket.statut)}`,
    ];
    return lines.join('\n');
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private initializeCurrentUser(): void {
    const tokenUserId = this.authService.getCurrentUserId();
    if (tokenUserId) {
      this.currentUserId = tokenUserId;
      this.createForm.userId = tokenUserId;
      this.updateForm.userId = tokenUserId;
      this.currentUserLoaded = true;
      this.loadAll(); // immediate load
      return;
    }
    if (!this.currentUserLoading) this.loadCurrentUser();
  }

  private applyCurrentUser(user: UserResponse): void {
    this.currentUser = user;
    this.currentUserId = user.id;
    this.createForm.userId = user.id;
    this.updateForm.userId = user.id;
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.formErrorMessage = '';
    this.seatTakenMessage = '';
  }

  private isSeatTakenForEdit(seatNumero: number): boolean {
    return this.tickets.some((ticket) => {
      if (ticket.id === this.updateForm.id) return false;
      if ((ticket.seance?.id ?? ticket.seanceId) !== this.selectedSeanceId) return false;
      const num = this.resolveSeatNumber(ticket);
      return num === seatNumero;
    });
  }

  private getReservationErrorMessage(err: any, fallbackMessage: string): string {
    const backendMessage =
      err?.error?.error ||
      err?.error?.message ||
      (typeof err?.error === 'string' ? err.error : '') ||
      err?.message ||
      '';
    const normalizedMessage = String(backendMessage).toLowerCase();
    if (normalizedMessage.includes('seat already reserved') || normalizedMessage.includes('dÃ©jÃ  rÃ©servÃ©') || normalizedMessage.includes('deja reserve')) {
      return 'This seat is already reserved for this showtime.';
    }
    if (normalizedMessage.includes('unexpected token')) {
      return 'Server returned an invalid response.';
    }
    return backendMessage || fallbackMessage;
  }

  private shouldHideCancelledDuplicate(ticket: ReservationCinemaEntity): boolean {
    if ((ticket.statut ?? '').toUpperCase() !== 'CANCELLED') return false;
    const ticketUserId = Number((ticket as any).userId ?? ticket.user?.id ?? 0);
    const ticketSeanceId = ticket.seance?.id ?? ticket.seanceId;
    if (!ticketUserId || !ticketSeanceId) return false;
    return this.tickets.some((otherTicket) => {
      if (otherTicket.id === ticket.id) return false;
      const otherUserId = Number((otherTicket as any).userId ?? otherTicket.user?.id ?? 0);
      const otherSeanceId = otherTicket.seance?.id ?? otherTicket.seanceId;
      const otherStatus = (otherTicket.statut ?? '').toUpperCase();
      return otherUserId === ticketUserId
        && otherSeanceId === ticketSeanceId
        && otherStatus !== 'CANCELLED'
        && otherTicket.id > ticket.id;
    });
  }

  private refreshTicketsAfterMutation(successMessage: string): void {
    this.resetMessages();
    this.successMessage = successMessage;
    this.activeTab = 'my-tickets';
    this.loadAll(true);
  }

  private preloadSeatNumbers(reservations: ReservationCinemaEntity[]): void {
    const seanceIds = [...new Set(
      reservations
        .map((ticket) => ticket.seance?.id ?? ticket.seanceId)
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
      next: (seatGroups: SeatOption[][]) => {
        const seatMap: Record<number, number> = {};
        seatGroups.flat().forEach((seat) => {
          if (seat?.id != null && seat?.seatNumber != null) {
            seatMap[seat.id] = seat.seatNumber;
          }
        });
        this.seatNumbersById = seatMap;
        this.generateTicketQRCodes(this.tickets);
      },
      error: () => {
        this.seatNumbersById = {};
        this.generateTicketQRCodes(this.tickets);
      },
    });
  }

  private generateTicketQRCodes(reservations: ReservationCinemaEntity[]): void {
    reservations.forEach((ticket) => {
      const qrText = this.getTicketQrSummary(ticket);

      QRCode.toDataURL(qrText, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
        color: {
          dark: '#1b2745',
          light: '#ffffff',
        },
      }).then((dataUrl: string) => {
        this.ticketQrCodes[ticket.id] = dataUrl;
      }).catch(() => {});
    });
  }

  private resolveSeatNumber(ticket: ReservationCinemaEntity): number | null {
    const seat = ticket.seat as any;
    const seatId = seat?.id ?? ticket.seatId;
    const mappedSeatNumber = seatId != null ? this.seatNumbersById[seatId] : undefined;
    const rawValue =
      seat?.seatNumber ??
      mappedSeatNumber ??
      seat?.numero ??
      seat?.seat_number ??
      this.extractSeatNumberFromLabel(seat?.fullLabel) ??
      this.extractSeatNumberFromLabel(seat?.label);

    return typeof rawValue === 'number'
      ? rawValue
      : rawValue != null && !Number.isNaN(Number(rawValue))
        ? Number(rawValue)
        : null;
  }

  private extractSeatNumberFromLabel(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  private resetState(): void {
    this.currentUser = null;
    this.currentUserId = null;
    this.currentUserLoaded = false;
    this.currentUserLoadFailed = false;
    this.tickets = [];
    this.seances = [];
    this.seats = [];
    this.seatNumbersById = {};
    this.ticketQrCodes = {};
    this.selectedSeanceId = null;
    this.activeTab = 'seances';
  }

}



