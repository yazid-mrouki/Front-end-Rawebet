import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FilmService } from '../../../features/cinema/services/film.service';
import { Film, CreateFilmRequest } from '../../../features/cinema/models/film.model';
import { TmdbService, TmdbMovie } from '../../../features/cinema/services/tmdb.service';

type ModalStep = 'search' | 'confirm';

export interface RoiResult {
  aiScore:             number;
  temporalScore:       number;
  finalScore:          number;
  temporalLabel:       string;
  temporalStatus:      string;
  weeksSinceRelease:   number | null;
  recommendation:      string;
  recommendationLevel: string;
  label:               string;
}

@Component({
  selector: 'app-admin-films',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-films.component.html'
})
export class AdminFilmsComponent implements OnInit, OnDestroy {

  films: Film[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';

  showModal = false;
  modalStep: ModalStep = 'search';
  isSubmitting = false;
  errorMessage = '';

  tmdbQuery = '';
  tmdbResults: TmdbMovie[] = [];
  isSearching = false;
  selectedMovie: TmdbMovie | null = null;
  private searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Prédiction ───────────────────────────────────────────────
  isLoadingRoi = false;
  roiResult: RoiResult | null = null;

  form: CreateFilmRequest = this.emptyForm();

  constructor(
    private filmService: FilmService,
    private tmdbService: TmdbService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFilms();
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
      error: () => { this.isSearching = false; this.cdr.detectChanges(); }
    });
  }

  ngOnDestroy(): void { this.searchSub?.unsubscribe(); }

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
      (f.director?.toLowerCase().includes(q) ?? false)
    );
  }

  openModal(): void {
    this.showModal   = true;
    this.modalStep   = 'search';
    this.tmdbQuery   = '';
    this.tmdbResults = [];
    this.selectedMovie = null;
    this.form        = this.emptyForm();
    this.errorMessage = '';
    this.roiResult   = null;
    this.isLoadingRoi = false;
  }

  closeModal(): void { this.showModal = false; this.cdr.detectChanges(); }

  onTmdbSearch(): void {
    if (this.tmdbQuery.trim().length < 2) { this.tmdbResults = []; return; }
    this.searchSubject.next(this.tmdbQuery.trim());
  }

  selectMovie(movie: TmdbMovie): void {
    this.selectedMovie = movie;
    this.isSearching   = true;
    this.roiResult     = null;
    this.isLoadingRoi  = false;
    this.cdr.detectChanges();

    let detailsDone = false, creditsDone = false, videosDone = false;
    const checkDone = () => {
      if (detailsDone && creditsDone && videosDone) {
        this.isSearching = false;
        this.modalStep   = 'confirm';
        this.cdr.detectChanges();
        this.fetchRoiPrediction();
      }
    };

    this.tmdbService.getDetails(movie.id).subscribe({
      next: (details) => {
        this.form.title           = details.title;
        this.form.synopsis        = details.overview;
        this.form.durationMinutes = details.runtime ?? 0;
        this.form.genre           = details.genres?.map(g => g.name).join(', ') ?? '';
        this.form.releaseDate     = details.release_date;
        this.form.posterUrl       = this.tmdbService.getPosterUrl(details.poster_path);
        this.form.imdbId          = details.imdb_id ?? '';
        this.form.language        = '';
        this.form.rating          = '';
        this.form.budget          = details.budget ?? null;
        this.form.popularity      = movie.popularity ?? null;
        detailsDone = true; checkDone();
      },
      error: () => { detailsDone = true; checkDone(); }
    });

    this.tmdbService.getCredits(movie.id).subscribe({
      next: (credits) => {
        const director        = credits.crew.find(c => c.job === 'Director');
        this.form.director    = director?.name ?? '';
        this.form.castSummary = credits.cast.slice(0, 5).map(c => c.name).join(', ');
        creditsDone = true; checkDone();
      },
      error: () => { creditsDone = true; checkDone(); }
    });

    this.tmdbService.getVideos(movie.id).subscribe({
      next: (videos) => {
        const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
                     ?? videos.results[0];
        this.form.trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '';
        videosDone = true; checkDone();
      },
      error: () => { videosDone = true; checkDone(); }
    });
  }

  fetchRoiPrediction(): void {
    if (!this.form.budget || this.form.budget <= 0 || !this.form.releaseDate) return;

    this.isLoadingRoi = true;
    this.cdr.detectChanges();

    const date         = new Date(this.form.releaseDate);
    const releaseYear  = date.getFullYear();
    const releaseMonth = date.getMonth() + 1;
    const genres       = this.form.genre ? this.form.genre.split(',').map(g => g.trim()) : [];

    this.filmService.predictRoi({
      title:         this.form.title,
      budget:        this.form.budget,
      runtime:       this.form.durationMinutes,
      release_year:  releaseYear,
      release_month: releaseMonth,
      release_date:  this.form.releaseDate,
      language:      'en',
      genres:        genres,
      overview:      this.form.synopsis ?? ''
    }).subscribe({
      next: (r: any) => {
        this.roiResult = {
          aiScore:             r.ai_score,
          temporalScore:       r.temporal_score,
          finalScore:          r.final_score,
          temporalLabel:       r.temporal_label,
          temporalStatus:      r.temporal_status,
          weeksSinceRelease:   r.weeks_since_release,
          recommendation:      r.recommendation,
          recommendationLevel: r.recommendation_level,
          label:               r.label
        };
        this.isLoadingRoi = false;
        this.cdr.detectChanges();
      },
      error: () => { this.roiResult = null; this.isLoadingRoi = false; this.cdr.detectChanges(); }
    });
  }

  backToSearch(): void {
    this.modalStep = 'search';
    this.selectedMovie = null;
    this.roiResult = null;
    this.cdr.detectChanges();
  }

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
      budget:      this.form.budget              ?? null,
      popularity:  this.form.popularity          ?? null,
    };

    this.filmService.create(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showModal    = false;
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

  deleteFilm(id: number): void {
    if (!confirm('Désactiver ce film ?')) return;
    this.filmService.disable(id).subscribe({
      next: () => { this.loadFilms(); this.cdr.detectChanges(); }
    });
  }

  // ── Utilitaires ──────────────────────────────────────────────
  getDurationLabel(min: number): string {
    if (!min) return '—';
    return `${Math.floor(min / 60)}h${min % 60 > 0 ? (min % 60) + 'min' : ''}`;
  }

  getPosterUrl(path: string): string { return this.tmdbService.getPosterUrl(path, 'w300'); }

  getYear(date: string): string { return date ? new Date(date).getFullYear().toString() : ''; }

  getPct(score: number): number { return Math.round(score * 100); }

  getRecoColor(): string {
    if (!this.roiResult) return 'gray';
    const level = this.roiResult.recommendationLevel;
    if (level === 'strong_yes' || level === 'yes') return 'green';
    if (level === 'maybe' || level === 'special' || level === 'wait') return 'amber';
    return 'red';
  }

  private emptyForm(): CreateFilmRequest {
    return {
      title: '', synopsis: '', durationMinutes: 0,
      language: '', genre: '', director: '', castSummary: '',
      rating: '', releaseDate: '', posterUrl: '', trailerUrl: '',
      imdbId: '', budget: null, popularity: null
    };
  }
}