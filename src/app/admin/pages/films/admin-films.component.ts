import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FilmService } from '../../../features/cinema/services/film.service';
import { Film, CreateFilmRequest } from '../../../features/cinema/models/film.model';
import { TmdbService, TmdbMovie } from '../../../features/cinema/services/tmdb.service';

type ModalStep = 'search' | 'confirm';

@Component({
  selector: 'app-admin-films',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-films.component.html'
})
export class AdminFilmsComponent implements OnInit, OnDestroy {

  // ── Liste films ──────────────────────────────────
  films: Film[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';

  // ── Modal état ───────────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'search';
  isSubmitting = false;
  errorMessage = '';

  // ── TMDB recherche ───────────────────────────────
  tmdbQuery = '';
  tmdbResults: TmdbMovie[] = [];
  isSearching = false;
  selectedMovie: TmdbMovie | null = null;
  private searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Formulaire final ─────────────────────────────
  form: CreateFilmRequest = this.emptyForm();

  constructor(
    private filmService: FilmService,
    private tmdbService: TmdbService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFilms();

    // Recherche TMDB avec debounce
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(query => {
        this.isSearching = true;
        this.cdr.detectChanges();
        return this.tmdbService.search(query);
      })
    ).subscribe({
      next: (res) => {
        this.tmdbResults = res.results.slice(0, 8);
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSearching = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ── Chargement liste ─────────────────────────────
  loadFilms(): void {
    this.isLoading = true;
    this.filmService.getAll().subscribe({
      next: (data) => { this.films = data; this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'Erreur de chargement.'; this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  get filteredFilms(): Film[] {
    const q = this.searchQuery.toLowerCase();
    return this.films.filter(f =>
      f.title.toLowerCase().includes(q) ||
      f.director.toLowerCase().includes(q)
    );
  }

  // ── Modal ────────────────────────────────────────
  openModal(): void {
    this.showModal = true;
    this.modalStep = 'search';
    this.tmdbQuery = '';
    this.tmdbResults = [];
    this.selectedMovie = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  // ── Recherche TMDB ───────────────────────────────
  onTmdbSearch(): void {
    if (this.tmdbQuery.trim().length < 2) {
      this.tmdbResults = [];
      return;
    }
    this.searchSubject.next(this.tmdbQuery.trim());
  }

  // ── Sélection d'un film TMDB ─────────────────────
  selectMovie(movie: TmdbMovie): void {
    this.selectedMovie = movie;
    this.isSearching = true;
    this.cdr.detectChanges();

    // Charger détails + crédits + vidéos en parallèle
    let detailsDone = false;
    let creditsDone = false;
    let videosDone = false;

    const checkDone = () => {
      if (detailsDone && creditsDone && videosDone) {
        this.isSearching = false;
        this.modalStep = 'confirm';
        this.cdr.detectChanges();
      }
    };

    // Détails complets
    this.tmdbService.getDetails(movie.id).subscribe({
      next: (details) => {
        this.form.title         = details.title;
        this.form.synopsis      = details.overview;
        this.form.durationMinutes = details.runtime ?? 0;
        this.form.genre         = details.genres?.map(g => g.name).join(', ') ?? '';
        this.form.releaseDate   = details.release_date;
        this.form.posterUrl     = this.tmdbService.getPosterUrl(details.poster_path);
        this.form.imdbId        = details.imdb_id ?? '';
        this.form.language      = '';   // à remplir manuellement
        this.form.rating        = '';   // à remplir manuellement
        detailsDone = true;
        checkDone();
      },
      error: () => { detailsDone = true; checkDone(); }
    });

    // Crédits (directeur + casting)
    this.tmdbService.getCredits(movie.id).subscribe({
      next: (credits) => {
        const director = credits.crew.find(c => c.job === 'Director');
        this.form.director    = director?.name ?? '';
        this.form.castSummary = credits.cast
          .slice(0, 5)
          .map(c => c.name)
          .join(', ');
        creditsDone = true;
        checkDone();
      },
      error: () => { creditsDone = true; checkDone(); }
    });

    // Trailer YouTube
    this.tmdbService.getVideos(movie.id).subscribe({
      next: (videos) => {
        const trailer = videos.results.find(
          v => v.type === 'Trailer' && v.site === 'YouTube'
        ) ?? videos.results[0];
        this.form.trailerUrl = trailer
          ? `https://www.youtube.com/watch?v=${trailer.key}`
          : '';
        videosDone = true;
        checkDone();
      },
      error: () => { videosDone = true; checkDone(); }
    });
  }

  backToSearch(): void {
    this.modalStep = 'search';
    this.selectedMovie = null;
    this.cdr.detectChanges();
  }

  // ── Création film ────────────────────────────────
  submitFilm(): void {
    if (!this.form.title || !this.form.director) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateFilmRequest = {
      ...this.form,
      imdbId:      this.form.imdbId?.trim()      || null as any,
      trailerUrl:  this.form.trailerUrl?.trim()  || null as any,
      posterUrl:   this.form.posterUrl?.trim()   || null as any,
      castSummary: this.form.castSummary?.trim() || null as any,
    };

    this.filmService.create(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showModal = false;
        this.loadFilms();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.status === 409
          ? 'Ce film existe déjà dans le catalogue.'
          : 'Erreur lors de la création du film.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Suppression ──────────────────────────────────
  deleteFilm(id: number): void {
    if (!confirm('Désactiver ce film ?')) return;
    this.filmService.disable(id).subscribe({
      next: () => { this.loadFilms(); this.cdr.detectChanges(); }
    });
  }

  // ── Utilitaires ──────────────────────────────────
  getDurationLabel(min: number): string {
    if (!min) return '—';
    return `${Math.floor(min / 60)}h${min % 60 > 0 ? (min % 60) + 'min' : ''}`;
  }

  getPosterUrl(path: string): string {
    return this.tmdbService.getPosterUrl(path, 'w300');
  }

  getYear(date: string): string {
    return date ? new Date(date).getFullYear().toString() : '';
  }

  private emptyForm(): CreateFilmRequest {
    return {
      title: '', synopsis: '', durationMinutes: 0,
      language: '', genre: '', director: '', castSummary: '',
      rating: '', releaseDate: '', posterUrl: '', trailerUrl: '', imdbId: ''
    };
  }
}