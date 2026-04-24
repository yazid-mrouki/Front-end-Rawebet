import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CinemaService } from '../../features/cinema/services/cinema.service';
import { Cinema } from '../../features/cinema/models/cinema.model';

interface CinemaWithDistance extends Cinema {
  distanceKm?: number;
}

@Component({
  selector: 'app-cinemas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cinemas.component.html'
})
export class CinemasComponent implements OnInit {

  cinemas: CinemaWithDistance[] = [];
  isLoading = true;
  error = '';

  // Géolocalisation
  userLat: number | null = null;
  userLng: number | null = null;
  geoLoading = false;
  geoError = '';
  geoRequested = false;

  constructor(
    private cinemaService: CinemaService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.cinemaService.getAll().subscribe({
      next: (data) => {
        this.cinemas = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger les cinémas.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Géolocalisation ────────────────────────────────
  locateMe(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      this.geoError = 'La géolocalisation n\'est pas disponible sur votre navigateur.';
      return;
    }
    this.geoLoading = true;
    this.geoRequested = true;
    this.geoError = '';
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.computeDistances();
        this.sortByDistance();
        this.geoLoading = false;
        this.cdr.detectChanges();
      },
      (err) => {
        this.geoLoading = false;
        this.geoError = err.code === 1
          ? 'Accès à la localisation refusé.'
          : 'Impossible de vous localiser.';
        this.cdr.detectChanges();
      },
      { timeout: 8000 }
    );
  }

  resetLocation(): void {
    this.userLat = null;
    this.userLng = null;
    this.geoRequested = false;
    this.geoError = '';
    this.cinemas.forEach(c => delete c.distanceKm);
    // Retrier par nom
    this.cinemas.sort((a, b) => a.name.localeCompare(b.name));
    this.cdr.detectChanges();
  }

  private computeDistances(): void {
    if (this.userLat === null || this.userLng === null) return;
    this.cinemas.forEach(c => {
      if (c.latitude && c.longitude) {
        c.distanceKm = this.haversine(
          this.userLat!, this.userLng!,
          c.latitude, c.longitude
        );
      }
    });
  }

  private sortByDistance(): void {
    this.cinemas.sort((a, b) => {
      if (a.distanceKm === undefined) return 1;
      if (b.distanceKm === undefined) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  // Formule de Haversine — distance en km entre deux coordonnées GPS
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  // ── Utilitaires ────────────────────────────────────
  isNearest(cinema: CinemaWithDistance): boolean {
    if (!this.userLat || cinema.distanceKm === undefined) return false;
    const min = Math.min(...this.cinemas
      .filter(c => c.distanceKm !== undefined)
      .map(c => c.distanceKm!));
    return cinema.distanceKm === min;
  }

  formatDistance(km: number): string {
    if (km < 1) return Math.round(km * 1000) + ' m';
    return km.toFixed(1) + ' km';
  }

  getMapUrl(lat: number, lng: number): SafeResourceUrl {
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.008},${lng + 0.008},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getDirectionsUrl(cinema: CinemaWithDistance): string {
    if (this.userLat && this.userLng) {
      return `https://www.openstreetmap.org/directions?from=${this.userLat},${this.userLng}&to=${cinema.latitude},${cinema.longitude}`;
    }
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(cinema.address + ' ' + cinema.city)}`;
  }
}