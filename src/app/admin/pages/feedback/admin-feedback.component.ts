import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { FeedbackResponse } from '../../../core/models/feedback.model';
import { UserResponse } from '../../../core/models/user.model';
import { Film } from '../../../features/cinema/models/film.model';
import { UserService } from '../../../core/services/user.service';
import { FilmService } from '../../../features/cinema/services/film.service';
import { catchError, forkJoin, of } from 'rxjs';

type SortField = 'id' | 'rating' | 'date' | 'author';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-feedback.component.html'
})
export class AdminFeedbackComponent implements OnInit {
  Math = Math;
  feedbacks: FeedbackResponse[] = [];
  users: UserResponse[] = [];
  films: Film[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  showDeleteDialog = false;
  feedbackToDelete: FeedbackResponse | null = null;
  
  // Search & Filter
  searchQuery = '';
  filmFilter = '';
  ratingFilter = '';
  
  // Pagination & Sorting
  currentPage = 1;
  pageSize = 10;
  sortField: SortField = 'date';
  sortOrder: SortOrder = 'desc';

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly userService: UserService,
    private readonly filmService: FilmService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFeedbacks();
  }

  // Statistics
  get stats() {
    const filtered = this.filteredFeedbacks;
    const avgRating = filtered.length > 0 
      ? (filtered.reduce((sum, f) => sum + f.note, 0) / filtered.length).toFixed(2)
      : '0.0';
    
    const ratingDistribution = {
      excellent: filtered.filter(f => f.note >= 4.5).length,
      good: filtered.filter(f => f.note >= 3.5 && f.note < 4.5).length,
      average: filtered.filter(f => f.note >= 2.5 && f.note < 3.5).length,
      poor: filtered.filter(f => f.note < 2.5).length,
    };

    return {
      total: filtered.length,
      avgRating,
      ratingDistribution,
    };
  }

  get filteredFeedbacks(): FeedbackResponse[] {
    let filtered = this.feedbacks;

    // Search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(f =>
        f.id?.toString().includes(query) ||
        (f.commentaire || '').toLowerCase().includes(query) ||
        this.getUserName(f).toLowerCase().includes(query)
      );
    }

    // Film filter
    if (this.filmFilter) {
      filtered = filtered.filter(f => f.filmId?.toString() === this.filmFilter);
    }

    // Rating filter
    if (this.ratingFilter) {
      const min = parseInt(this.ratingFilter);
      filtered = filtered.filter(f => f.note >= min);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (this.sortField) {
        case 'rating':
          aVal = a.note;
          bVal = b.note;
          break;
        case 'date':
          aVal = new Date(a.date || '').getTime();
          bVal = new Date(b.date || '').getTime();
          break;
        case 'author':
          aVal = this.getUserName(a).toLowerCase();
          bVal = this.getUserName(b).toLowerCase();
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  get paginatedFeedbacks(): FeedbackResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredFeedbacks.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredFeedbacks.length / this.pageSize);
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
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filmFilter = '';
    this.ratingFilter = '';
    this.currentPage = 1;
    this.sortField = 'date';
    this.sortOrder = 'desc';
  }

  loadFeedbacks(): void {
    this.loading = true;
    this.resetMessages();

    forkJoin({
      feedbacks: this.feedbackService.getAll().pipe(catchError(() => of([] as FeedbackResponse[]))),
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as UserResponse[]))),
      films: this.filmService.getAll().pipe(catchError(() => of([] as Film[]))),
    }).subscribe({
      next: ({ feedbacks, users, films }) => {
        this.feedbacks = feedbacks;
        this.users = users;
        this.films = films;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error ?? 'Error loading feedback.';
      },
    });
  }

  getUserName(feedback: FeedbackResponse): string {
    const user = (feedback as any).user;
    if (user?.fullName) return user.fullName;
    if (user?.nom) return user.nom;
    if (user?.username) return user.username;
    const resolvedUser = this.users.find(u => u.id === feedback.userId);
    if (resolvedUser?.nom) return resolvedUser.nom;
    return `User #${feedback.userId}`;
  }

  getFilmName(feedback: FeedbackResponse): string {
    const film = (feedback as any).film;
    if (film?.title) return film.title;
    if (film?.nom) return film.nom;
    const resolvedFilm = this.films.find(f => f.id === feedback.filmId);
    return resolvedFilm?.title || `Movie #${feedback.filmId}`;
  }

  getRatingClass(rating: number): string {
    if (rating >= 4.5) return 'bg-green-500/20 text-green-300';
    if (rating >= 3.5) return 'bg-blue-500/20 text-blue-300';
    if (rating >= 2.5) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  }

  getRatingLabel(rating: number): string {
    if (rating >= 4.5) return 'Excellent (5/5)';
    if (rating >= 3.5) return 'Good (4/5)';
    if (rating >= 2.5) return 'Average (3/5)';
    return 'Low (2/5)';
  }

  formatDate(value: string | null | undefined): string {
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

  openDeleteDialog(feedback: FeedbackResponse): void {
    this.feedbackToDelete = feedback;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.feedbackToDelete = null;
  }

  confirmDelete(): void {
    if (!this.feedbackToDelete?.id) return;
    const feedbackId = this.feedbackToDelete.id;
    this.closeDeleteDialog();
    this.deleteFeedback(feedbackId);
  }

  deleteFeedback(id: number): void {
    this.resetMessages();
    this.feedbackService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Feedback deleted successfully.';
        this.loadFeedbacks();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Error while deleting.';
      },
    });
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  trackById(_: number, item: { id?: number }): number {
    return item.id ?? 0;
  }
}

