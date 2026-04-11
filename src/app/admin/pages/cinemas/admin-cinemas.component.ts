import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CinemaService } from '../../../features/cinema/services/cinema.service';
import { SalleCinemaService } from '../../../features/cinema/services/salle-cinema.service';
import { SeatService } from '../../../features/cinema/services/seat.service';
import { Cinema, CreateCinemaRequest } from '../../../features/cinema/models/cinema.model';
import { SalleCinema, CreateSalleRequest } from '../../../features/cinema/models/salle-cinema.model';
import { ConfigureHallRequest, RowConfig, SeatType, SeatRowResponse } from '../../../features/cinema/models/seat.model';

type ModalType = 'cinema' | 'salle' | 'seats' | null;

@Component({
  selector: 'app-admin-cinemas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cinemas.component.html'
})
export class AdminCinemasComponent implements OnInit {

  cinemas: Cinema[] = [];
  sallesMap: Record<number, SalleCinema[]> = {};
  expandedCinemaId: number | null = null;
  isLoading = true;
  error = '';
searchQuery = '';
searchSalle = '';

get filteredCinemas(): Cinema[] {
  const q = this.searchQuery.toLowerCase().trim();
  if (!q) return this.cinemas;
  return this.cinemas.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.city.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q)
  );
}

getSallesFiltrees(cinemaId: number): SalleCinema[] {
  const salles = this.sallesMap[cinemaId] ?? [];
  const q = this.searchSalle.toLowerCase().trim();
  if (!q) return salles;
  return salles.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.hallType.toLowerCase().includes(q) ||
    s.screenType.toLowerCase().includes(q)
  );
}

  activeModal: ModalType = null;
  isSubmitting = false;
  selectedCinemaId: number | null = null;
  selectedSalleId: number | null = null;

  cinemaForm: CreateCinemaRequest = {
    name: '', address: '', city: '', country: '', phone: '', email: '', openingHours: ''
  };

  salleForm: CreateSalleRequest = {
    cinemaId: 0, name: '', hallType: 'STANDARD', screenType: 'TWO_D'
  };

  numberOfRows = 5;
  rowConfigs: RowConfig[] = [];

  constructor(
    private cinemaService: CinemaService,
    private salleService: SalleCinemaService,
    private seatService: SeatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadCinemas(); }

  // ── Chargement ─────────────────────────────────────
  loadCinemas(): void {
    this.isLoading = true;
    this.cinemaService.getAll().subscribe({
      next: (data) => { this.cinemas = data; this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'Erreur de chargement.'; this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  toggleSalles(cinemaId: number): void {
    this.expandedCinemaId = this.expandedCinemaId === cinemaId ? null : cinemaId;
    if (this.expandedCinemaId && !this.sallesMap[cinemaId]) {
      this.salleService.getByCinema(cinemaId).subscribe({
        next: (salles) => { this.sallesMap[cinemaId] = salles; this.cdr.detectChanges(); },
        error: () => { this.sallesMap[cinemaId] = []; this.cdr.detectChanges(); }
      });
    }
  }

  // ── Modals ─────────────────────────────────────────
  openCinemaModal(): void {
    this.cinemaForm = { name: '', address: '', city: '', country: '', phone: '', email: '', openingHours: '' };
    this.activeModal = 'cinema';
  }

  openSalleModal(cinemaId: number): void {
    this.selectedCinemaId = cinemaId;
    this.salleForm = { cinemaId, name: '', hallType: 'STANDARD', screenType: 'TWO_D' };
    this.activeModal = 'salle';
  }

  openSeatsModal(salleId: number): void {
    this.selectedSalleId = salleId;
    this.activeModal = 'seats';
    this.isSubmitting = false;
    this.rowConfigs = [];

    this.seatService.getRowsBySalle(salleId).subscribe({
      next: (rows: SeatRowResponse[]) => {
        if (rows && rows.length > 0) {
          this.rowConfigs = rows.map(r => ({
            rowLabel: r.rowLabel,
            seatsPerRow: r.seatCount,
            seatType: r.dominantSeatType
          }));
          this.numberOfRows = rows.length;
        } else {
          this.numberOfRows = 5;
          this.generateRowConfigs();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.numberOfRows = 5;
        this.generateRowConfigs();
        this.cdr.detectChanges();
      }
    });
  }

  closeModal(): void {
    this.activeModal = null;
    this.cdr.detectChanges();
  }

  // ── Rangées ────────────────────────────────────────
  generateRowConfigs(): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const current = this.rowConfigs;
    this.rowConfigs = Array.from({ length: this.numberOfRows }, (_, i) => {
      if (current[i]) return current[i];
      return {
        rowLabel: letters[i] || `R${i + 1}`,
        seatsPerRow: 10,
        seatType: 'STANDARD' as SeatType
      };
    });
    this.cdr.detectChanges();
  }

  get totalSeats(): number {
    return this.rowConfigs.reduce((sum, r) => sum + r.seatsPerRow, 0);
  }

  // ── Soumissions ────────────────────────────────────
  submitCinema(): void {
    if (!this.cinemaForm.name) return;
    this.isSubmitting = true;
    this.cinemaService.create(this.cinemaForm).subscribe({
      next: () => { this.isSubmitting = false; this.activeModal = null; this.loadCinemas(); this.cdr.detectChanges(); },
      error: () => { this.isSubmitting = false; this.cdr.detectChanges(); }
    });
  }

  submitSalle(): void {
    if (!this.salleForm.name) return;
    this.isSubmitting = true;
    this.salleService.create(this.salleForm).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.activeModal = null;
        if (this.selectedCinemaId) {
          this.salleService.getByCinema(this.selectedCinemaId).subscribe(s => {
            this.sallesMap[this.selectedCinemaId!] = s;
            this.cdr.detectChanges();
          });
        }
        this.cdr.detectChanges();
      },
      error: () => { this.isSubmitting = false; this.cdr.detectChanges(); }
    });
  }

  submitSeats(): void {
    if (!this.selectedSalleId || this.rowConfigs.length === 0) return;
    this.isSubmitting = true;

    const req: ConfigureHallRequest = {
      salleId: this.selectedSalleId,
      rowConfigs: this.rowConfigs.map(r => ({
        rowLabel: r.rowLabel,
        seatsPerRow: r.seatsPerRow,
        seatType: r.seatType
      }))
    };

    this.seatService.configureHall(req).subscribe({
      next: () => { this.isSubmitting = false; this.activeModal = null; this.cdr.detectChanges(); },
      error: () => { this.isSubmitting = false; this.cdr.detectChanges(); }
    });
  }

  disableCinema(id: number): void {
    if (!confirm('Désactiver ce cinéma ?')) return;
    this.cinemaService.disable(id).subscribe({
      next: () => { this.loadCinemas(); this.cdr.detectChanges(); }
    });
  }

  disableSalle(cinemaId: number, salleId: number): void {
    if (!confirm('Désactiver cette salle ?')) return;
    this.salleService.disable(salleId).subscribe({
      next: () => {
        this.sallesMap[cinemaId] = this.sallesMap[cinemaId].filter(s => s.id !== salleId);
        this.cdr.detectChanges();
      }
    });
  }

  getScreenLabel(t: string): string {
    return ({ TWO_D: '2D', THREE_D: '3D', IMAX: 'IMAX' } as any)[t] ?? t;
  }
}