import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CinemaService } from '../../features/cinema/services/cinema.service';
import { SalleCinemaService } from '../../features/cinema/services/salle-cinema.service';
import { Cinema } from '../../features/cinema/models/cinema.model';
import { SalleCinema } from '../../features/cinema/models/salle-cinema.model';

@Component({
  selector: 'app-cinemas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cinemas.component.html'
})
export class CinemasComponent implements OnInit {

  cinemas: Cinema[] = [];
  sallesMap: Record<number, SalleCinema[]> = {};
  expandedCinemaId: number | null = null;
  isLoading = true;
  error = '';
  

 constructor(
    private cinemaService: CinemaService,
    private salleService: SalleCinemaService,
    private cdr: ChangeDetectorRef  // ← AJOUT
  ) {}

  ngOnInit(): void {
    this.cinemaService.getAll().subscribe({
      next: (data) => { this.cinemas = data; this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'Impossible de charger les cinémas.'; this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  toggleSalles(cinemaId: number): void {
    if (this.expandedCinemaId === cinemaId) { this.expandedCinemaId = null; return; }
    this.expandedCinemaId = cinemaId;
    if (!this.sallesMap[cinemaId]) {
      this.salleService.getByCinema(cinemaId).subscribe({
        next: (salles) => { this.sallesMap[cinemaId] = salles; this.cdr.detectChanges(); },
        error: () => { this.sallesMap[cinemaId] = []; this.cdr.detectChanges(); }
      });
    }
  }

  getScreenLabel(type: string): string {
    const labels: Record<string, string> = {
      TWO_D: '2D', THREE_D: '3D', IMAX: 'IMAX'
    };
    return labels[type] ?? type;
  }

  getHallLabel(type: string): string {
    const labels: Record<string, string> = {
      STANDARD: 'Standard', PREMIUM: 'Premium'
    };
    return labels[type] ?? type;
  }
}