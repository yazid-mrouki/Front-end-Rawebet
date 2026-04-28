import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Seance, SeancePayload, SeanceResponse } from '../../../core/models/seance.model';
import { SeanceService } from '../../../core/services/seance.service';
import { catchError, of } from 'rxjs';

type FilmOption = { id: number; title?: string; nom?: string };
type SalleOption = { id: number; name?: string; nom?: string };
type SortField = 'id' | 'date' | 'price' | 'film' | 'salle';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-admin-seances',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-seances.component.html'
})
export class AdminSeancesComponent implements OnInit {
  Math = Math;
  seances: Seance[] = [];
  filteredSeancesCache: Seance[] = [];
  films: FilmOption[] = [];
  salles: SalleOption[] = [];
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  showDeleteDialog = false;
  seanceToDelete: Seance | null = null;
  errorMessages: Record<string, string> = {};
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  filmFilter = '';
  salleFilter = '';
  loading = false;
  
  // Pagination & Sorting
  currentPage = 1;
  pageSize = 10;
  sortField: SortField = 'date';
  sortOrder: SortOrder = 'asc';

  formData: SeancePayload = {
    dateHeure: '',
    prixBase: 0,
    langue: '',
    filmId: 0,
    salleCinemaId: 0,
  };

  constructor(
    private readonly seanceService: SeanceService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSeances();
    this.loadFilms();
    this.loadSalles();
  }

  // Statistics
  get stats() {
    const filtered = this.filteredSeances;
    const avgPrice = filtered.length > 0 
      ? (filtered.reduce((sum, s) => sum + (s.prixBase || 0), 0) / filtered.length).toFixed(2)
      : '0.00';
    
    return {
      total: filtered.length,
      avgPrice: avgPrice,
      maxPrice: filtered.length > 0 ? Math.max(...filtered.map(s => s.prixBase || 0)) : 0,
      languages: new Set(filtered.map(s => s.langue).filter(l => l)).size,
    };
  }

  get filteredSeances(): Seance[] {
    return this.filteredSeancesCache;
  }

  get paginatedSeances(): Seance[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSeances.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSeances.length / this.pageSize));
  }

  get visiblePageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1)
      .filter((page) => page >= this.currentPage - 1 && page <= this.currentPage + 1);
  }

  setSortField(field: SortField): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.applyFilters(false);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filmFilter = '';
    this.salleFilter = '';
    this.currentPage = 1;
    this.sortField = 'date';
    this.sortOrder = 'asc';
    this.applyFilters(false);
  }

  loadSeances(): void {
    this.loading = true;
    this.seanceService.getAll().pipe(
      catchError(() => of([] as SeanceResponse[]))
    ).subscribe({
      next: (data) => {
        this.seances = Array.isArray(data) ? data : [];
        this.applyFilters(false);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = 'Error loading showtimes.';
      }
    });
  }

  loadFilms(): void {
    this.seanceService.getFilmNames().subscribe({
      next: (response) => {
        const films = this.unwrapCollection<FilmOption>(response);
        this.films = films
          .filter((film) => film && (film as any).id != null)
          .map((film) => ({
            id: Number((film as any).id),
            title: (film as any).title || (film as any).nom || '',
            nom: (film as any).nom,
          }));
        this.applyFilters(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.films = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadSalles(): void {
    this.seanceService.getSalleNames().subscribe({
      next: (response) => {
        const salles = this.unwrapCollection<SalleOption>(response);
        this.salles = salles
          .filter((salle) => salle && (salle as any).id != null)
          .map((salle) => ({
            id: Number((salle as any).id),
            name: (salle as any).name || (salle as any).nom || '',
            nom: (salle as any).nom,
          }));
        this.applyFilters(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.salles = [];
        this.cdr.detectChanges();
      }
    });
  }

  getFilmName(seance: Seance): string {
    if ((seance as any).filmTitle) return (seance as any).filmTitle;
    const film = (seance as any).film;
    if (film?.title) return film.title;
    if (film?.nom) return film.nom;
    const filmId = this.extractFilmId(seance);
    const filmOption = this.films.find(f => f.id === filmId);
    return filmOption?.title || filmOption?.nom || `Movie #${filmId}`;
  }

  getSalleName(seance: Seance): string {
    if ((seance as any).salleName) return (seance as any).salleName;
    if ((seance as any).salleCinemaName) return (seance as any).salleCinemaName;
    const salle = (seance as any).salleCinema || (seance as any).salle;
    if (salle?.name) return salle.name;
    if (salle?.nom) return salle.nom;
    const salleId = this.extractSalleId(seance);
    const salleOption = this.salles.find(s => s.id === salleId);
    return salleOption?.name || salleOption?.nom || `Room #${salleId}`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  validateForm(): boolean {
    this.errorMessages = {};

    if (!this.formData.filmId) {
      this.errorMessages['filmId'] = 'This field is required';
    }

    if (!this.formData.salleCinemaId) {
      this.errorMessages['salleCinemaId'] = 'This field is required';
    }

    if (!this.formData.dateHeure) {
      this.errorMessages['dateHeure'] = 'This field is required';
    }

    if (this.formData.prixBase === null || this.formData.prixBase === undefined) {
      this.errorMessages['prixBase'] = 'This field is required';
    } else if (this.formData.prixBase < 10 || this.formData.prixBase > 500) {
      this.errorMessages['prixBase'] = 'Price must be between 10 and 500 dinars';
    }

    if (!this.formData.langue || this.formData.langue.trim() === '') {
      this.errorMessages['langue'] = 'This field is required';
    }

    return Object.keys(this.errorMessages).length === 0;
  }

  resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  openDeleteDialog(seance: Seance): void {
    this.seanceToDelete = seance;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.seanceToDelete = null;
  }

  confirmDelete(): void {
    if (!this.seanceToDelete?.id) return;
    const seanceId = this.seanceToDelete.id;
    this.closeDeleteDialog();
    this.deleteSeance(seanceId);
  }

  deleteSeance(id: number): void {
    this.resetMessages();
    this.seanceService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Showtime deleted successfully.';
        this.loadSeances();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Error while deleting.';
      },
    });
  }

  onSubmit(form?: NgForm): void {
    this.resetMessages();
    form?.control.markAllAsTouched();

    if (!this.validateForm()) {
      return;
    }

    const call = this.isEditing && this.editingId
      ? this.seanceService.update(this.editingId, this.formData)
      : this.seanceService.create(this.formData);

    call.subscribe({
      next: () => {
        const successLabel = this.isEditing ? 'Showtime updated successfully.' : 'Showtime added successfully.';
        this.loadSeances();
        this.resetForm(form);
        this.successMessage = successLabel;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'An error occurred.';
      },
    });
  }

  startEdit(seance: Seance): void {
    this.isEditing = true;
    this.editingId = seance.id || null;
    this.showForm = true;
    this.formData = {
      dateHeure: seance.dateHeure || '',
      prixBase: seance.prixBase || 0,
      langue: seance.langue || '',
      filmId: this.extractFilmId(seance),
      salleCinemaId: this.extractSalleId(seance),
    };
    this.resetMessages();
  }

  resetForm(form?: NgForm): void {
    this.formData = {
      dateHeure: '',
      prixBase: 0,
      langue: '',
      filmId: 0,
      salleCinemaId: 0,
    };
    this.errorMessages = {};
    this.isEditing = false;
    this.editingId = null;
    this.showForm = false;
    form?.resetForm({
      dateHeure: '',
      prixBase: 0,
      langue: '',
      filmId: 0,
      salleCinemaId: 0,
    });
  }



  getFilmLabel(film: FilmOption): string {
    return film.title || film.nom || `Movie #${film.id}`;
  }

  getSalleLabel(salle: SalleOption): string {
    return salle.name || salle.nom || `Room #${salle.id}`;
  }

  applyFilters(resetPage: boolean = true): void {
    if (resetPage) {
      this.currentPage = 1;
    }

    let filtered = [...this.seances];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        s.id?.toString().includes(query)
        || this.getFilmName(s).toLowerCase().includes(query)
        || this.getSalleName(s).toLowerCase().includes(query)
        || (s.langue || '').toLowerCase().includes(query)
      );
    }

    if (this.filmFilter) {
      filtered = filtered.filter((s) => this.extractFilmId(s).toString() === this.filmFilter);
    }

    if (this.salleFilter) {
      filtered = filtered.filter((s) => this.extractSalleId(s).toString() === this.salleFilter);
    }

    filtered.sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      switch (this.sortField) {
        case 'date':
          aVal = new Date(a.dateHeure || '').getTime();
          bVal = new Date(b.dateHeure || '').getTime();
          break;
        case 'price':
          aVal = a.prixBase || 0;
          bVal = b.prixBase || 0;
          break;
        case 'film':
          aVal = this.getFilmName(a).toLowerCase();
          bVal = this.getFilmName(b).toLowerCase();
          break;
        case 'salle':
          aVal = this.getSalleName(a).toLowerCase();
          bVal = this.getSalleName(b).toLowerCase();
          break;
        default:
          aVal = a.id ?? 0;
          bVal = b.id ?? 0;
      }

      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredSeancesCache = filtered;
    this.currentPage = Math.min(this.currentPage, Math.max(this.totalPages, 1));
  }

  private toDateTimeLocalValue(value: string): string {
    return value ? String(value).slice(0, 16) : '';
  }

  private extractFilmId(seance: Seance): number {
    return Number((seance as any).filmId ?? (seance as any).film?.id ?? 0);
  }

  private extractSalleId(seance: Seance): number {
    return Number((seance as any).salleCinemaId ?? (seance as any).salleCinema?.id ?? (seance as any).salle?.id ?? 0);
  }

  private unwrapCollection<T>(response: any): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (Array.isArray(response?.data)) {
      return response.data as T[];
    }

    if (Array.isArray(response?.content)) {
      return response.content as T[];
    }

    if (Array.isArray(response?.results)) {
      return response.results as T[];
    }

    return [];
  }

  trackById(_: number, item: { id?: number }): number {
    return item.id ?? 0;
  }
}
