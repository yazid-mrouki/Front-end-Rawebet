import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilmService } from '../../features/cinema/services/film.service';
import { Film } from '../../features/cinema/models/film.model';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import { Router } from '@angular/router';

@Component({
  selector: 'app-films',
  standalone: true,
  imports: [CommonModule, SafeUrlPipe],
  templateUrl: './films.component.html',
  styleUrl: './films.component.scss'
})
export class FilmsComponent implements OnInit, AfterViewInit {

  allFilms: Film[] = [];
  nowShowing: Film[] = [];
  comingSoon: Film[] = [];
  heroFilm: Film | null = null;
  heroIndex = 0;
  isLoading = true;
  error = '';
  showTrailer = false;
  trailerUrl = '';

  private heroInterval: any;

  constructor(
  private filmService: FilmService,
  private cdr: ChangeDetectorRef,
  private router: Router
) {}

  ngOnInit(): void {
    this.filmService.getAll().subscribe({
      next: (films) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.allFilms = films;

        this.nowShowing = films
          .filter(f => f.releaseDate && new Date(f.releaseDate) <= today)
          .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

        this.comingSoon = films
          .filter(f => f.releaseDate && new Date(f.releaseDate) > today)
          .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

        // Hero = les 4 films les plus récents à l'affiche
        this.heroFilm = this.nowShowing[0] ?? null;

        this.isLoading = false;
        this.cdr.detectChanges();

        // Auto-rotate hero toutes les 5s
        if (this.nowShowing.length > 1) {
          this.heroInterval = setInterval(() => {
            this.nextHero();
          }, 5000);
        }
      },
      error: () => {
        this.error = 'Impossible de charger les films.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.heroInterval) clearInterval(this.heroInterval);
  }

  // ── Hero navigation ───────────────────────────────
  get heroFilms(): Film[] {
    return this.nowShowing.slice(0, 4);
  }

  selectHero(index: number): void {
    this.heroIndex = index;
    this.heroFilm = this.heroFilms[index];
    this.cdr.detectChanges();
  }

  goToFilm(id: number): void {
  this.router.navigate(['/films', id]);
}

  nextHero(): void {
    const next = (this.heroIndex + 1) % this.heroFilms.length;
    this.selectHero(next);
  }

  // ── Utilitaires ───────────────────────────────────
  getDurationLabel(minutes: number): string {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? m + 'min' : ''}`;
  }

  getStars(rating: number): number[] {
    return Array(Math.min(Math.floor(rating ?? 0), 5)).fill(0);
  }

  getReleaseDateLabel(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  getPosterBg(index: number): string {
    const gradients = [
      'linear-gradient(145deg,#1a1a2e,#16213e,#0f3460)',
      'linear-gradient(145deg,#2d1b69,#11998e,#38ef7d)',
      'linear-gradient(145deg,#c0392b,#8e44ad,#2c3e50)',
      'linear-gradient(145deg,#f7971e,#ffd200,#c0392b)',
      'linear-gradient(145deg,#0f2027,#203a43,#2c5364)',
      'linear-gradient(145deg,#134e5e,#71b280,#1d4350)',
      'linear-gradient(145deg,#3d0c02,#c0392b,#7b241c)',
      'linear-gradient(145deg,#0d0d2b,#1a237e,#283593)',
    ];
    return gradients[index % gradients.length];
  }

  getHeroBg(index: number): string {
    const bgs = [
      'linear-gradient(135deg,#0a0a1a 0%,#1a0a2e 50%,#0d1a3a 100%)',
      'linear-gradient(135deg,#1a0a00 0%,#2e1a00 50%,#1a1000 100%)',
      'linear-gradient(135deg,#0a1a0a 0%,#0d2e1a 50%,#001a10 100%)',
      'linear-gradient(135deg,#1a000a 0%,#2e0010 50%,#1a000d 100%)',
    ];
    return bgs[index % bgs.length];
  }

  isNew(dateStr: string): boolean {
    if (!dateStr) return false;
    const release = new Date(dateStr);
    const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }

openTrailer(url: string): void {
  if (!url) return;
  const videoId = url.includes('watch?v=')
    ? url.split('watch?v=')[1].split('&')[0]
    : url.split('/').pop() ?? '';
  this.trailerUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  setTimeout(() => {
    this.showTrailer = true;
    this.cdr.detectChanges();
  }, 0);
}

closeTrailer(): void {
  setTimeout(() => {
    this.showTrailer = false;
    this.trailerUrl = '';
    this.cdr.detectChanges();
  }, 0);
}
}