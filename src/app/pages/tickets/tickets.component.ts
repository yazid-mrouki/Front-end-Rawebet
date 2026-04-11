import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
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

interface FilmCatalogItem {
  id: number;
  title: string;
  genre: string;
  duration: string;
  emoji: string;
}

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
  loading = false;
  submitting = false;
  currentUser: UserResponse | null = null;
  currentUserId: number | null = null;
  currentUserLoading = false;
  currentUserLoaded = false;
  currentUserLoadFailed = false;
  errorMessage = '';
  successMessage = '';
  formErrorMessage = '';
  editMode = false;
  selectedSeanceId: number | null = null;

  readonly filmCatalog: FilmCatalogItem[] = [
    { id: 1, title: 'The Last Horizon', genre: 'Sci-Fi / Drama', duration: '2h 15min', emoji: '🎬' },
    { id: 2, title: 'Whispers of the Past', genre: 'Mystery / Thriller', duration: '1h 55min', emoji: '🔍' },
    { id: 3, title: 'Echoes of Home', genre: 'Drama / Family', duration: '2h 05min', emoji: '🏠' },
    { id: 4, title: 'Neon Nights', genre: 'Action / Cyberpunk', duration: '2h 20min', emoji: '🌃' },
    { id: 5, title: 'The Garden of Words', genre: 'Animation / Romance', duration: '1h 30min', emoji: '🌸' },
    { id: 6, title: 'Under the Stars', genre: 'Documentary', duration: '1h 45min', emoji: '🌟' },
  ];

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
    private readonly authService: AuthService,
    private readonly reservationCinemaService: ReservationCinemaService,
    private readonly seatService: SeatService,
    private readonly seanceService: SeanceService,
    private readonly userService: UserService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.activeTab = 'seances';
    this.initializeCurrentUser();

    this.authService.authState.subscribe((authenticated) => {
      if (authenticated) {
        if (!this.editMode) {
          this.activeTab = 'seances';
        }

        this.initializeCurrentUser();
      } else {
        this.currentUser = null;
        this.currentUserId = null;
        this.currentUserLoaded = false;
        this.currentUserLoadFailed = false;
        this.tickets = [];
        this.seances = [];
        this.seats = [];
        this.selectedSeanceId = null;
        this.activeTab = 'seances';
      }
    });
  }

  get myTickets(): ReservationCinemaEntity[] {
    if (this.currentUserId === null) {
      return [];
    }

    return [...this.tickets]
      .filter((ticket) => ticket.user?.id === this.currentUserId)
      .sort((left, right) => right.id - left.id);
  }

  get availableSeances(): SeanceResponse[] {
    return [...this.seances].sort((left, right) =>
      new Date(left.dateHeure).getTime() - new Date(right.dateHeure).getTime(),
    );
  }

  get selectedSeance(): SeanceResponse | null {
    if (!this.selectedSeanceId) {
      return null;
    }

    return this.seances.find((seance) => seance.id === this.selectedSeanceId) ?? null;
  }

  loadCurrentUser(): void {
    this.currentUserLoading = true;
    this.currentUserLoadFailed = false;
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
        this.currentUser = null;
        this.currentUserId = null;
        this.createForm.userId = 0;
        this.updateForm.userId = 0;
        this.loadAll();
      },
    });
  }

  loadAll(): void {
    this.loading = true;
    this.resetMessages();

    forkJoin({
      seances: this.seanceService.getAll().pipe(
        catchError(() => {
          this.errorMessage = this.errorMessage || 'Impossible de charger les seances.';
          return of([] as SeanceResponse[]);
        }),
      ),
      reservations: this.reservationCinemaService.getAll().pipe(
        catchError((error) => {
          this.errorMessage = this.errorMessage || error?.error?.error || 'Impossible de charger les reservations.';
          return of([] as ReservationCinemaEntity[]);
        }),
      ),
    }).subscribe({
      next: ({ seances, reservations }) => {
        this.seances = seances;
        this.tickets = reservations;

        if (!this.editMode) {
          this.activeTab = 'seances';
        }

        if (this.selectedSeanceId && !this.seances.some((seance) => seance.id === this.selectedSeanceId)) {
          this.selectedSeanceId = null;
          this.createForm.seanceId = 0;
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  openReservationForSeance(seance: SeanceResponse): void {
  this.resetMessages();
  this.editMode = false;
  this.selectedSeanceId = seance.id;
  this.seats = [];
  this.createForm = {
    userId: this.currentUserId ?? 0,
    seanceId: seance.id,
    seatNumero: 0,
  };
  this.activeTab = 'reservation';

  console.log('Chargement seats pour seanceId:', seance.id); // ← ajoute ça
  this.seatService.getSeatsBySeance(seance.id).subscribe({
    next: (seats) => {
      console.log('Seats reçus:', seats); // ← et ça
      this.seats = seats;
    },
    error: (err) => {
      console.error('Erreur seats:', err); // ← et ça
      this.seats = [];
    },
  });
}
  addTicket(form: NgForm): void {
    if (this.submitting) {
      return;
    }

    this.createForm.userId = this.currentUserId ?? 0;
    this.createForm.seanceId = this.selectedSeanceId ?? this.createForm.seanceId;
    this.createForm.seatNumero = Number(this.createForm.seatNumero) || 0;

    if (!this.currentUserLoaded || !this.currentUserId) {
      this.errorMessage = "Impossible d'identifier l'utilisateur connecte.";
      return;
    }

    if (form.invalid || !this.isCreateFormValid()) {
      this.formErrorMessage = 'Il faut completer tous les champs du formulaire.';
      form.control.markAllAsTouched();
      return;
    }

    this.resetMessages();
    this.submitting = true;
    this.reservationCinemaService.add(this.createForm)
      .pipe(finalize(() => {
        this.submitting = false;
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'Ticket reserve avec succes.';
          this.createForm = {
            userId: this.currentUserId ?? 0,
            seanceId: this.selectedSeanceId ?? 0,
            seatNumero: 0,
          };
          form.resetForm({
            seatNumero: 0,
          });
          this.activeTab = 'my-tickets';
          this.loadAll();
        },
        error: (error) => {
          this.errorMessage = error?.error?.error ?? "Erreur lors de la reservation du ticket.";
        },
      });
  }

  startEdit(ticket: ReservationCinemaEntity): void {
    this.resetMessages();
    this.editMode = true;
    this.selectedSeanceId = ticket.seance?.id ?? null;
    this.activeTab = 'reservation';
    this.updateForm = {
      id: ticket.id,
      dateReservation: ticket.dateReservation ?? '',
      statut: ticket.statut ?? 'PENDING',
      userId: this.currentUserId ?? ticket.user?.id ?? 0,
      seanceId: ticket.seance?.id ?? 0,
      seatId: ticket.seat?.id ?? 0,
      paiementId: ticket.paiement?.id ?? null,
    };
  }

  updateTicket(form: NgForm): void {
    this.updateForm.userId = this.currentUserId ?? this.updateForm.userId;
    this.updateForm.seanceId = this.selectedSeanceId ?? this.updateForm.seanceId;

    if (form.invalid || !this.isUpdateFormValid()) {
      this.formErrorMessage = 'Il faut completer correctement les champs obligatoires.';
      form.control.markAllAsTouched();
      return;
    }

    this.resetMessages();
    this.reservationCinemaService.update(this.updateForm).subscribe({
      next: () => {
        this.successMessage = 'Ticket mis a jour avec succes.';
        this.cancelEdit();
        this.activeTab = 'my-tickets';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Erreur lors de la mise a jour du ticket.';
      },
    });
  }

  deleteTicket(id: number): void {
    this.resetMessages();
    this.reservationCinemaService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Ticket supprime avec succes.';
        this.loadAll();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Erreur lors de la suppression du ticket.';
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
      userId: this.currentUserId ?? 0,
      seanceId: this.selectedSeanceId ?? 0,
      seatId: 0,
      paiementId: null,
    };
  }

  goToSeances(): void {
    this.editMode = false;
    this.formErrorMessage = '';
    this.seats = [];
    this.activeTab = 'seances';
  }

  showFieldError(control: NgModel | null | undefined, form: NgForm): boolean {
    if (!control) {
      return false;
    }

    return Boolean(control.invalid) && Boolean(control.touched || form.submitted);
  }

  getSeatErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Veuillez choisir un siege.';
    }

    if (control.errors['min']) {
      return 'Le numero du siege doit etre superieur ou egal a 1.';
    }

    if (control.errors['max']) {
      return 'Le numero du siege doit etre inferieur ou egal a 500.';
    }

    return 'Siege invalide.';
  }

  getDisplayedSeatNumber(ticket: ReservationCinemaEntity): number | string {
    return ticket.seat?.numero ?? ticket.seat?.id ?? '-';
  }

  getPaiementErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['min']) {
      return 'Le paiement ne peut pas etre negatif.';
    }

    if (control.errors['max']) {
      return 'Le paiement est trop grand.';
    }

    return 'Valeur invalide.';
  }

  getFilmTitleBySeanceId(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return 'Film indisponible';
    }

    const seance = this.seances.find((item) => item.id === seanceId);
    if (!seance?.filmId) {
      return 'Film indisponible';
    }

    const film = this.filmCatalog.find((item) => item.id === seance.filmId);
    return film?.title ?? `Film #${seance.filmId}`;
  }

  getFilmGenreBySeanceId(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return 'Programmation cinema';
    }

    const seance = this.seances.find((item) => item.id === seanceId);
    const film = this.filmCatalog.find((item) => item.id === seance?.filmId);
    return film?.genre ?? 'Programmation cinema';
  }

  getFilmEmojiBySeanceId(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return '🎟️';
    }

    const seance = this.seances.find((item) => item.id === seanceId);
    const film = this.filmCatalog.find((item) => item.id === seance?.filmId);
    return film?.emoji ?? '🎟️';
  }

  getFilmDurationBySeanceId(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return '-';
    }

    const seance = this.seances.find((item) => item.id === seanceId);
    const film = this.filmCatalog.find((item) => item.id === seance?.filmId);
    return film?.duration ?? '-';
  }

  getSeanceDateTimeById(seanceId: number | null | undefined): string {
    if (!seanceId) {
      return '-';
    }

    return this.seances.find((item) => item.id === seanceId)?.dateHeure ?? '-';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(date);
  }

  getStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirme';
      case 'CANCELLED':
        return 'Annule';
      case 'PENDING':
      default:
        return 'En attente';
    }
  }

  getStatusClasses(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-50 text-green-700';
      case 'CANCELLED':
        return 'bg-red-50 text-red-600';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-700';
    }
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
      this.currentUserLoadFailed = false;
      this.loadAll();
      return;
    }

    if (!this.currentUserLoading) {
      this.loadCurrentUser();
    }
  }

  private applyCurrentUser(user: UserResponse): void {
    this.currentUser = user;
    this.currentUserId = user.id;
    this.createForm.userId = user.id;
    this.updateForm.userId = user.id;
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
}
