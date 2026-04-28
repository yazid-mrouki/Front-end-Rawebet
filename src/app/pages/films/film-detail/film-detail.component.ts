import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FilmService } from '../../../features/cinema/services/film.service';
import { Film } from '../../../features/cinema/models/film.model';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';

@Component({
  selector: 'app-film-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeUrlPipe],
  templateUrl: './film-detail.component.html'
})
export class FilmDetailComponent implements OnInit {

  film: Film | null = null;
  isLoading = true;
  error = '';
  showTrailer = false;
  trailerEmbedUrl = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private filmService: FilmService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error = 'Film introuvable.'; this.isLoading = false; return; }

    this.filmService.getById(id).subscribe({
      next: (film) => { this.film = film; this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'Film introuvable.'; this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  goBack(): void { this.router.navigate(['/films']); }

  openTrailer(): void {
    if (!this.film?.trailerUrl) return;
    const url = this.film.trailerUrl;
    const videoId = url.includes('watch?v=')
      ? url.split('watch?v=')[1].split('&')[0]
      : url.split('/').pop() ?? '';
    this.trailerEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    this.showTrailer = true;
    this.cdr.detectChanges();
  }

  closeTrailer(): void {
    this.showTrailer = false;
    this.trailerEmbedUrl = '';
    this.cdr.detectChanges();
  }

  getDurationLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? m + 'min' : ''}`;
  }

  getReleaseDateLabel(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  getStars(rating: number): number[] {
    return Array(Math.min(Math.round(rating), 5)).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(Math.max(5 - Math.round(rating), 0)).fill(0);
  }

  isNew(dateStr: string): boolean {
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24) <= 30;
  }
}