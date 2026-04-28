import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
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
  templateUrl: './admin-cinemas.component.html',
  styles: [`#cinema-map { height: 260px; width: 100%; }`]
})
export class AdminCinemasComponent implements OnInit, OnDestroy {

  cinemas: Cinema[] = [];
  cinemaErrors: Record<string, string> = {};
  salleErrors: Record<string, string> = {};
  sallesMap: Record<number, SalleCinema[]> = {};
  seatsErrors: Record<string, string> = {};
  expandedCinemaId: number | null = null;
  isLoading = true;
  error = '';
  searchQuery = '';
  searchSalle = '';

  private L: any = null;
  private map: any = null;
  private marker: any = null;
  isGeoLoading = false;
  submitError = '';
  openFrom = '09:00';
  openTo = '23:00';

  // Propriété statique au lieu d'un getter — évite les recalculs à chaque CD
  readonly hoursOptions: string[] = (() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        opts.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return opts;
  })();

  activeModal: ModalType = null;
  isSubmitting = false;
  selectedCinemaId: number | null = null;
  selectedSalleId: number | null = null;

  cinemaForm: CreateCinemaRequest = {
    name: '', address: '', city: '', country: '',
    phone: '', email: '', openingHours: '',
    latitude: undefined, longitude: undefined, timezone: undefined
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
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void { this.loadCinemas(); }
  ngOnDestroy(): void { this.destroyMap(); }

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

  get totalStandard(): number {
  return this.rowConfigs
    .filter(r => r.seatType === 'STANDARD')
    .reduce((s, r) => s + r.seatsPerRow, 0);
}

get totalPmr(): number {
  return this.rowConfigs
    .filter(r => r.seatType === 'PMR')
    .reduce((s, r) => s + r.seatsPerRow, 0);
}

getSeatArray(count: number): number[] {
  return Array(Math.min(count, 50)).fill(0);
}

getSeatSize(seatsPerRow: number): number {
  // Adapte la taille des sièges selon le nombre dans la rangée
  if (seatsPerRow <= 10) return 16;
  if (seatsPerRow <= 16) return 13;
  if (seatsPerRow <= 24) return 10;
  return 8;
}

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

  openCinemaModal(): void {
    this.cinemaForm = {
      name: '', address: '', city: '', country: '',
      phone: '', email: '', openingHours: '',
      latitude: undefined, longitude: undefined, timezone: undefined
    };
    this.cinemaErrors = {};
    this.submitError = '';
    this.openFrom = '09:00';
    this.openTo = '23:00';
    this.activeModal = 'cinema';
    this.cdr.detectChanges();
    if (isPlatformBrowser(this.platformId)) {
      this.loadLeafletAndInitMap();
    }
  }

  openSalleModal(cinemaId: number): void {
    this.selectedCinemaId = cinemaId;
    this.salleForm = { cinemaId, name: '', hallType: 'STANDARD', screenType: 'TWO_D' };
    this.salleErrors = {};
    this.activeModal = 'salle';
  }

  openSeatsModal(salleId: number): void {
    this.selectedSalleId = salleId;
    this.activeModal = 'seats';
    this.isSubmitting = false;
    this.seatsErrors = {};
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
      error: () => { this.numberOfRows = 5; this.generateRowConfigs(); this.cdr.detectChanges(); }
    });
  }

  closeModal(): void {
    this.destroyMap();
    this.activeModal = null;
    this.cdr.detectChanges();
  }

  // ── Leaflet ────────────────────────────────────────
  private async loadLeafletAndInitMap(): Promise<void> {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!(window as any).L) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });
    }
    this.L = (window as any).L;
    this.waitForContainer();
  }

  private waitForContainer(attempts = 0): void {
    const el = document.getElementById('cinema-map');
    if (el && el.offsetHeight > 0) {
      this.initMap(el);
    } else if (attempts < 30) {
      setTimeout(() => this.waitForContainer(attempts + 1), 50);
    }
  }

  private initMap(container: HTMLElement): void {
    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
      container.innerHTML = '';
    }
    if (this.map) { this.map.remove(); this.map = null; }
    const L = this.L;
    this.map = L.map(container, { center: [36.8189, 10.1658], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);
    this.map.on('click', (e: any) => {
      this.ngZone.run(() => this.setLocation(e.latlng.lat, e.latlng.lng));
    });
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  private setLocation(lat: number, lng: number): void {
    if (!this.L || !this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = this.L.marker([lat, lng]).addTo(this.map);
    }
    this.cinemaForm.latitude = parseFloat(lat.toFixed(6));
    this.cinemaForm.longitude = parseFloat(lng.toFixed(6));
    this.cdr.detectChanges();
    this.reverseGeocode(lat, lng);
  }

  useMyLocation(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) return;
    this.isGeoLoading = true;
    this.cdr.detectChanges();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ngZone.run(() => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (this.map) this.map.setView([lat, lng], 15);
          this.setLocation(lat, lng);
        });
      },
      () => { this.ngZone.run(() => { this.isGeoLoading = false; this.cdr.detectChanges(); }); }
    );
  }

  private reverseGeocode(lat: number, lng: number): void {
    this.isGeoLoading = true;
    this.cdr.detectChanges();
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`)
      .then(r => r.json())
      .then(data => {
        this.ngZone.run(() => {
          const addr = data.address || {};
          this.cinemaForm.address = data.display_name?.split(',').slice(0, 3).join(',').trim() || '';
          this.cinemaForm.city = addr.city || addr.town || addr.village || addr.county || '';
          this.cinemaForm.country = addr.country || '';
          this.cinemaForm.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          this.isGeoLoading = false;
          this.cdr.detectChanges();
        });
      })
      .catch(() => { this.ngZone.run(() => { this.isGeoLoading = false; this.cdr.detectChanges(); }); });
  }

  private destroyMap(): void {
    if (this.marker) { this.marker.remove(); this.marker = null; }
    if (this.map) { this.map.remove(); this.map = null; }
  }

  // ── Validation ─────────────────────────────────────
  validateCinema(): boolean {
    this.cinemaErrors = {};
    const f = this.cinemaForm;
    if (!f.name?.trim())
      this.cinemaErrors['name'] = 'Le nom est obligatoire';
    else if (f.name.trim().length < 2)
      this.cinemaErrors['name'] = 'Le nom doit contenir au moins 2 caractères';
    if (!f.address?.trim())
      this.cinemaErrors['address'] = 'L\'adresse est obligatoire';
    if (!f.city?.trim())
      this.cinemaErrors['city'] = 'La ville est obligatoire';
    if (!f.country?.trim())
      this.cinemaErrors['country'] = 'Le pays est obligatoire';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      this.cinemaErrors['email'] = 'Format d\'email invalide';
    if (f.phone && !/^[+\d\s\-(). ]{6,20}$/.test(f.phone))
      this.cinemaErrors['phone'] = 'Numéro de téléphone invalide';
    return Object.keys(this.cinemaErrors).length === 0;
  }

  validateSalle(): boolean {
    this.salleErrors = {};
    if (!this.salleForm.name?.trim())
      this.salleErrors['name'] = 'Le nom de la salle est obligatoire';
    if (!this.salleForm.hallType)
      this.salleErrors['hallType'] = 'Le type de salle est obligatoire';
    if (!this.salleForm.screenType)
      this.salleErrors['screenType'] = 'Le type d\'écran est obligatoire';
    return Object.keys(this.salleErrors).length === 0;
  }

  validateSeats(): boolean {
    this.seatsErrors = {};
    if (this.rowConfigs.length === 0)
      this.seatsErrors['global'] = 'Ajoutez au moins une rangée';
    if (this.numberOfRows < 1 || this.numberOfRows > 26)
      this.seatsErrors['rows'] = 'Le nombre de rangées doit être entre 1 et 26';
    const invalidRow = this.rowConfigs.find(r => r.seatsPerRow < 1 || r.seatsPerRow > 50);
    if (invalidRow)
      this.seatsErrors['seats'] = `La rangée ${invalidRow.rowLabel} doit avoir entre 1 et 50 sièges`;
    return Object.keys(this.seatsErrors).length === 0;
  }

  // ── Soumissions ────────────────────────────────────
  submitCinema(): void {
    this.submitError = '';
    if (!this.validateCinema()) return;

    this.cinemaForm.openingHours = `${this.openFrom} - ${this.openTo}`;
    this.isSubmitting = true;

    this.cinemaService.create(this.cinemaForm).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.destroyMap();
        this.activeModal = null;
        this.loadCinemas();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || err?.error?.error || '';
        if (err?.status === 409 || msg.toLowerCase().includes('slug') || msg.toLowerCase().includes('existe')) {
          this.submitError = `Un cinéma avec le nom "${this.cinemaForm.name}" existe déjà.`;
        } else if (err?.status === 400) {
          this.submitError = msg || 'Données invalides, vérifiez le formulaire.';
        } else {
          this.submitError = 'Erreur serveur, veuillez réessayer.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  submitSalle(): void {
    if (!this.validateSalle()) return;
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
      error: (err) => {
        this.isSubmitting = false;
        this.salleErrors['global'] = err?.error?.message || 'Erreur lors de la création';
        this.cdr.detectChanges();
      }
    });
  }

  submitSeats(): void {
    if (!this.validateSeats()) return;
    this.isSubmitting = true;
    const req: ConfigureHallRequest = {
      salleId: this.selectedSalleId!,
      rowConfigs: this.rowConfigs.map(r => ({
        rowLabel: r.rowLabel,
        seatsPerRow: r.seatsPerRow,
        seatType: r.seatType
      }))
    };
    this.seatService.configureHall(req).subscribe({
      next: () => { this.isSubmitting = false; this.activeModal = null; this.cdr.detectChanges(); },
      error: (err) => {
        this.isSubmitting = false;
        this.seatsErrors['global'] = err?.error?.message || 'Erreur lors de la configuration';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Rangées ────────────────────────────────────────
  generateRowConfigs(): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const current = this.rowConfigs;
    this.rowConfigs = Array.from({ length: this.numberOfRows }, (_, i) => {
      if (current[i]) return current[i];
      return { rowLabel: letters[i] || `R${i + 1}`, seatsPerRow: 10, seatType: 'STANDARD' as SeatType };
    });
    this.cdr.detectChanges();
  }

  get totalSeats(): number {
    return this.rowConfigs.reduce((sum, r) => sum + r.seatsPerRow, 0);
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