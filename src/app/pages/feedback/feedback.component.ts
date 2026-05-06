import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { SeanceService } from '../../core/services/seance.service';
import { UserService } from '../../core/services/user.service';
import { RecommendationService } from '../../core/services/recommendation.service';
import { ReservationCinemaService } from '../../core/services/reservation-cinema.service';
import { FilmService } from '../../features/cinema/services/film.service';
import { Film } from '../../features/cinema/models/film.model';
import { UserResponse } from '../../core/models/user.model';
import { ReservationCinemaEntity } from '../../core/models/reservation-cinema.model';
import { SeanceResponse } from '../../core/models/seance.model';
import { MovieRecommendation } from '../../core/models/recommendation.model';
import {
  CreateFeedbackRequest,
  FeedbackMutationResult,
  FeedbackResponse,
  UpdateFeedbackRequest,
} from '../../core/models/feedback.model';
import {
  EMPTY_SENTIMENT_ANALYSIS,
  SentimentAnalysis,
} from '../../core/models/feedback-ai.model';
import { FeedbackAiService } from '../../core/services/feedback-ai.service';
import {
  EMPTY_MODERATION_ANALYSIS,
  ModerationAnalysis,
} from '../../core/utils/feedback-moderation.util';

type UserFilmOption = {
  id: number;
  label: string;
};

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent implements OnInit {
  feedbacks: FeedbackResponse[] = [];
  userReservations: ReservationCinemaEntity[] = [];
  userSeances: SeanceResponse[] = [];
  userFilms: UserFilmOption[] = [];
  allFilms: Array<{ id: number; title: string }> = [];
  filmsLoading = false;
  filmsLoaded = false;
  loading = false;
  currentUser: UserResponse | null = null;
  currentUserId: number | null = null;
  currentUserLoading = false;
  currentUserLoaded = false;
  errorMessage = '';
  successMessage = '';
  warningMessage = '';
  warningDialogOpen = false;
  warningDialogMessage = '';
  warningDialogComment = '';
  private readonly warningModerationMessage = "Your feedback contains forbidden words. A warning email will be sent.";
  recommendationLoading = false;
  recommendationError = '';
  recommendedFilms: MovieRecommendation[] = [];
  deleteDialogOpen = false;
  feedbackIdToDelete: number | null = null;
  formErrorMessage = '';
  editMode = false;
  createModeration: ModerationAnalysis = { ...EMPTY_MODERATION_ANALYSIS };
  updateModeration: ModerationAnalysis = { ...EMPTY_MODERATION_ANALYSIS };
  createSentiment: SentimentAnalysis = { ...EMPTY_SENTIMENT_ANALYSIS };
  updateSentiment: SentimentAnalysis = { ...EMPTY_SENTIMENT_ANALYSIS };
  feedbackSentiments: Record<number, SentimentAnalysis> = {};
  private createModerationTimer: ReturnType<typeof setTimeout> | null = null;
  private updateModerationTimer: ReturnType<typeof setTimeout> | null = null;
  private createSentimentTimer: ReturnType<typeof setTimeout> | null = null;
  private updateSentimentTimer: ReturnType<typeof setTimeout> | null = null;

  feedbackForm: CreateFeedbackRequest = {
    userId: 0,
    filmId: 0,
    commentaire: '',
    note: 5,
  };

  updateForm: UpdateFeedbackRequest = {
    id: 0,
    userId: 0,
    filmId: 0,
    commentaire: '',
    note: 5,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly feedbackService: FeedbackService,
    private readonly seanceService: SeanceService,
    private readonly reservationCinemaService: ReservationCinemaService,
    private readonly filmService: FilmService,
    private readonly userService: UserService,
    private readonly http: HttpClient,
    private readonly recommendationService: RecommendationService,
    private readonly feedbackAiService: FeedbackAiService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initializeCurrentUser();
    this.loadAllFilms();
    this.authService.authState.subscribe((authenticated) => {
      if (authenticated) {
        this.initializeCurrentUser();
      } else {
        this.currentUser = null;
        this.currentUserId = null;
        this.currentUserLoaded = false;
        this.feedbacks = [];
        this.feedbackSentiments = {};
        this.userReservations = [];
        this.userSeances = [];
        this.userFilms = [];
        this.cdr.detectChanges();
      }
    });
  }

  get totalFeedback(): number {
    return this.feedbacks.length;
  }

  get averageRating(): string {
    if (!this.feedbacks.length) {
      return '0.0';
    }

    const average = this.feedbacks.reduce((sum, item) => sum + item.note, 0) / this.feedbacks.length;
    return average.toFixed(1);
  }

  get bestRecommendation(): MovieRecommendation | null {
    return this.recommendedFilms.length ? this.recommendedFilms[0] : null;
  }

  loadFeedbacks(): void {
    if (!this.currentUserLoaded) {
      this.feedbacks = [];
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.feedbackService.getMine().subscribe({
      next: (data) => {
        this.feedbacks = data;
        this.analyzeFeedbackSentiments();
        this.buildUserFilms();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getRequestErrorMessage(error, 'loading');
        this.cdr.detectChanges();
      },
    });
  }

  loadUserReservations(): void {
    if (!this.currentUserId) {
      this.userReservations = [];
      this.userSeances = [];
      this.userFilms = [];
      this.filmsLoaded = true;
      this.cdr.detectChanges();
      return;
    }

    this.filmsLoading = true;
    this.filmsLoaded = false;

    forkJoin({
      reservations: this.reservationCinemaService.getByUserId(this.currentUserId),
      seances: this.seanceService.getAll(),
    }).subscribe({
      next: ({ reservations, seances }) => {
        this.userReservations = Array.isArray(reservations) ? reservations : [];
        this.userSeances = Array.isArray(seances) ? seances : [];
        this.buildUserFilms();
        this.filmsLoading = false;
        this.filmsLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.userReservations = [];
        this.userSeances = [];
        this.buildUserFilms();
        this.filmsLoading = false;
        this.filmsLoaded = true;
        this.errorMessage = this.errorMessage || 'Unable to load movies linked to your showtimes.';
        this.cdr.detectChanges();
      },
    });
  }

  buildUserFilms(): void {
    const uniqueFilms = new Map<number, UserFilmOption>();

    (this.allFilms || []).forEach((film) => {
      const filmId = Number(film?.id ?? 0);
      const label = film?.title?.trim() || '';

      if (filmId > 0 && label) {
        uniqueFilms.set(filmId, { id: filmId, label });
      }
    });

    (this.userReservations || []).forEach((reservation) => {
      const reservationSeanceId = Number(reservation?.seance?.id ?? reservation?.seanceId ?? 0);
      const seance: any =
        reservation?.seance
        || this.userSeances.find((item) => item.id === reservationSeanceId)
        || null;
      const film: any = seance?.film;
      const fallbackFilmId = seance?.filmId;
      const fallbackTitle = seance?.filmTitle;
      const filmId = Number(film?.id ?? fallbackFilmId ?? 0);
      const label = film?.title || film?.nom || fallbackTitle || (filmId > 0 ? `Movie #${filmId}` : '');

      if (filmId > 0 && label) {
        uniqueFilms.set(filmId, { id: filmId, label });
      }
    });

    (this.feedbacks || []).forEach((feedback) => {
      const filmId = Number(feedback?.filmId ?? 0);
      if (!filmId || uniqueFilms.has(filmId)) {
        return;
      }

      const seance: any = this.userSeances.find((item) => Number(item.filmId ?? 0) === filmId);
      const catalogFilm = this.allFilms.find((item) => Number(item.id) === filmId);
      const label = seance?.film?.title || seance?.film?.nom || seance?.filmTitle || catalogFilm?.title || `Movie #${filmId}`;
      uniqueFilms.set(filmId, { id: filmId, label });
    });

    this.userFilms = Array.from(uniqueFilms.values());
  }

  onCreateCommentChange(): void {
    this.scheduleCreateModerationAnalysis();
    this.scheduleCreateSentimentAnalysis();
  }

  onUpdateCommentChange(): void {
    this.scheduleUpdateModerationAnalysis();
    this.scheduleUpdateSentimentAnalysis();
  }

  onCreateNoteChange(): void {
    this.scheduleCreateSentimentAnalysis();
  }

  onUpdateNoteChange(): void {
    this.scheduleUpdateSentimentAnalysis();
  }

  addFeedback(form: NgForm): void {
    const feedbackDraft = {
      userId: this.currentUserId ?? 0,
      filmId: this.feedbackForm.filmId,
      commentaire: this.feedbackForm.commentaire,
      note: this.feedbackForm.note,
    };
    this.feedbackForm.userId = this.currentUserId ?? 0;
    this.scheduleCreateSentimentAnalysis();

    if (!this.currentUserLoaded || !this.currentUserId) {
      this.errorMessage = "Unable to identify the signed-in user.";
      return;
    }

    if (form.invalid || !this.isCreateFormValid()) {
      this.formErrorMessage = 'Please complete all required form fields.';
      form.control.markAllAsTouched();
      return;
    }

    this.resetMessages();
    this.feedbackService.addWithModeration(this.feedbackForm).subscribe({
      next: (result) => {
        if (result.feedback) {
          this.feedbacks = [
            this.normalizeFeedbackResponse(result.feedback, feedbackDraft),
            ...this.feedbacks.filter((item) => item.id !== result.feedback?.id),
          ];
        }
        this.feedbackForm = {
          userId: this.currentUserId ?? 0,
          filmId: 0,
          commentaire: '',
          note: 5,
        };
        this.createModeration = { ...EMPTY_MODERATION_ANALYSIS };
        this.createSentiment = { ...EMPTY_SENTIMENT_ANALYSIS };
        form.resetForm({
          filmId: 0,
          note: 5,
          commentaire: '',
        });
        this.handleMutationResult(result, 'Feedback added successfully.', feedbackDraft.commentaire);
      },
      error: (error) => {
        this.handleMutationError(error, 'create');
        this.cdr.detectChanges();
      },
    });
  }

  startEdit(feedback: FeedbackResponse): void {
    this.resetMessages();
    this.editMode = true;
    this.updateForm = {
      id: feedback.id,
      userId: feedback.userId ?? this.currentUserId ?? 0,
      filmId: feedback.filmId ?? 0,
      commentaire: feedback.commentaire,
      note: feedback.note,
    };
    this.scheduleUpdateSentimentAnalysis();
    this.cdr.detectChanges();
  }

  updateFeedback(form: NgForm): void {
    const updateDraft = {
      id: this.updateForm.id,
      userId: this.currentUserId ?? this.updateForm.userId,
      filmId: this.updateForm.filmId,
      commentaire: this.updateForm.commentaire,
      note: this.updateForm.note,
      date: this.feedbacks.find((item) => item.id === this.updateForm.id)?.date ?? null,
    };
    this.updateForm.userId = this.currentUserId ?? this.updateForm.userId;
    this.scheduleUpdateSentimentAnalysis();

    if (!this.currentUserLoaded || !this.currentUserId) {
      this.errorMessage = "Unable to identify the signed-in user.";
      return;
    }

    if (form.invalid || !this.isUpdateFormValid()) {
      this.formErrorMessage = 'Please correctly complete required fields.';
      form.control.markAllAsTouched();
      return;
    }

    this.resetMessages();
    this.feedbackService.updateWithModeration(this.updateForm).subscribe({
      next: (result) => {
        if (result.feedback) {
          const normalizedFeedback = this.normalizeFeedbackResponse(result.feedback, updateDraft);
          this.feedbacks = this.feedbacks.map((item) => item.id === normalizedFeedback.id ? normalizedFeedback : item);
        }
        this.cancelEdit();
        this.handleMutationResult(result, 'Feedback updated successfully.', updateDraft.commentaire);
        this.scrollToFeedbackList();
      },
      error: (error) => {
        this.handleMutationError(error, 'update');
        this.cdr.detectChanges();
      },
    });
  }

  deleteFeedback(id: number): void {
    this.feedbackIdToDelete = id;
    this.deleteDialogOpen = true;
  }

  closeDeleteDialog(): void {
    this.deleteDialogOpen = false;
    this.feedbackIdToDelete = null;
  }

  confirmDeleteFeedback(): void {
    if (this.feedbackIdToDelete == null) {
      this.closeDeleteDialog();
      return;
    }

    const id = this.feedbackIdToDelete;
    this.closeDeleteDialog();
    this.resetMessages();
    this.feedbackService.delete(id).subscribe({
      next: () => {
        this.feedbacks = this.feedbacks.filter((item) => item.id !== id);
        delete this.feedbackSentiments[id];
        this.refreshFeedbacksAfterMutation('Feedback deleted successfully.');
      },
      error: (error) => {
        this.errorMessage = this.getRequestErrorMessage(error, 'deletion');
        this.cdr.detectChanges();
      },
    });
  }

  cancelEdit(): void {
    this.editMode = false;
    this.formErrorMessage = '';
    this.updateForm = {
      id: 0,
      userId: this.currentUserId ?? 0,
      filmId: 0,
      commentaire: '',
      note: 5,
    };
    this.updateModeration = { ...EMPTY_MODERATION_ANALYSIS };
    this.updateSentiment = { ...EMPTY_SENTIMENT_ANALYSIS };
    this.cdr.detectChanges();
  }

  showFieldError(control: NgModel | null | undefined, form: NgForm): boolean {
    if (!control) {
      return false;
    }

    return Boolean(control.invalid) && Boolean(control.touched || form.submitted);
  }

  getFilmIdErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Movie is required.';
    }

    if (control.errors['min']) {
      return 'Choose a valid movie.';
    }

    return 'Invalid movie.';
  }

  getNoteErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Rating is required.';
    }

    if (control.errors['min']) {
      return 'Minimum rating is 1.';
    }

    if (control.errors['max']) {
      return 'Maximum rating is 5.';
    }

    return 'Invalid rating.';
  }

  getCommentaireErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Comment is required.';
    }

    if (control.errors['minlength']) {
      return 'Comment must contain at least 3 characters.';
    }

    if (control.errors['maxlength']) {
      return 'Comment must not exceed 500 characters.';
    }

    return 'Invalid comment.';
  }

  getFilmLabel(filmId: number | null | undefined): string {
    if (!filmId) {
      return 'Movie unavailable';
    }

    return this.userFilms.find((item) => item.id === filmId)?.label
      ?? this.allFilms.find((item) => Number(item.id) === Number(filmId))?.title
      ?? `Movie #${filmId}`;
  }

  getCurrentUserName(): string {
    return this.currentUser?.nom?.trim() || this.authService.getCurrentUserName().trim() || 'User';
  }

  getFeedbackSentiment(feedbackId: number): SentimentAnalysis {
    return this.feedbackSentiments[feedbackId] ?? EMPTY_SENTIMENT_ANALYSIS;
  }

  getSentimentLabel(sentiment: SentimentAnalysis): string {
    switch (sentiment.label) {
      case 'positive':
        return 'positive';
      case 'negative':
        return 'negative';
      case 'neutral':
        return 'neutral';
      default:
        return 'undetermined';
    }
  }

  getSentimentClass(sentiment: SentimentAnalysis): string {
    switch (sentiment.label) {
      case 'positive':
        return 'border-green-200 bg-green-50/70 text-green-800';
      case 'negative':
        return 'border-rose-200 bg-rose-50/70 text-rose-800';
      case 'neutral':
        return 'border-slate-200 bg-slate-50 text-slate-700';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-600';
    }
  }

  loadRecommendations(): void {
    if (!this.currentUserId) {
      this.recommendationError = 'User not found to load recommendations.';
      this.recommendedFilms = [];
      this.cdr.detectChanges();
      return;
    }

    this.recommendationLoading = true;
    this.recommendationError = '';
    this.recommendedFilms = [];

    this.recommendationService.getBestFeedbackRecommendation(this.currentUserId).subscribe({
      next: (recommendations) => {
        this.recommendedFilms = Array.isArray(recommendations) ? recommendations : [];
        this.recommendationLoading = false;
        if (!this.recommendedFilms.length) {
          this.recommendationError = 'No recommendation available at the moment.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.recommendationLoading = false;
        this.recommendedFilms = [];
        this.recommendationError = 'Unable to load recommendations.';
        this.cdr.detectChanges();
      },
    });
  }

  private initializeCurrentUser(): void {
    const tokenUserId = this.authService.getCurrentUserId();
    if (tokenUserId) {
      this.currentUserId = tokenUserId;
      this.feedbackForm.userId = tokenUserId;
      this.updateForm.userId = tokenUserId;
      this.currentUserLoaded = true;
      if (!this.currentUser) {
        this.loadCurrentUserProfile();
      }
      this.loadFeedbacks();
      this.loadUserReservations();
      return;
    }

    if (this.currentUserLoading) {
      return;
    }

    this.loadCurrentUserProfile();
  }

  private loadAllFilms(): void {
    this.http.get<Array<{ id: number; title: string }>>(`${environment.apiUrl}/api/films/names`).subscribe({
      next: (films: Array<{ id: number; title: string }>) => {
        this.allFilms = Array.isArray(films) ? films : [];
        this.buildUserFilms();
        this.cdr.detectChanges();
      },
      error: () => {
        this.filmService.getAll().subscribe({
          next: (films) => {
            this.allFilms = (Array.isArray(films) ? films : []).map((film) => ({
              id: Number(film.id),
              title: film.title,
            }));
            this.buildUserFilms();
            this.cdr.detectChanges();
          },
          error: () => {
            this.allFilms = [];
          },
        });
      },
    });
  }

  private loadCurrentUserProfile(): void {
    this.currentUserLoading = true;
    this.userService.getMe().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.currentUserId = user.id;
        this.feedbackForm.userId = user.id;
        this.updateForm.userId = user.id;
        this.currentUserLoaded = true;
        this.currentUserLoading = false;
        this.loadFeedbacks();
        this.loadUserReservations();
      },
      error: () => {
        this.currentUserLoading = false;
        this.currentUserLoaded = false;
        this.currentUser = null;
        this.currentUserId = null;
        this.feedbacks = [];
        this.feedbackSentiments = {};
        this.userReservations = [];
        this.userSeances = [];
        this.userFilms = [];
        this.cdr.detectChanges();
      },
    });
  }

  private isCreateFormValid(): boolean {
    return this.feedbackForm.filmId > 0
      && this.feedbackForm.note >= 1
      && this.feedbackForm.note <= 5
      && this.feedbackForm.commentaire.trim().length >= 3;
  }

  private isUpdateFormValid(): boolean {
    return this.updateForm.id > 0
      && this.updateForm.filmId > 0
      && this.updateForm.note >= 1
      && this.updateForm.note <= 5
      && this.updateForm.commentaire.trim().length >= 3;
  }

  private scheduleCreateSentimentAnalysis(): void {
    if (this.createSentimentTimer) {
      clearTimeout(this.createSentimentTimer);
    }

    this.createSentimentTimer = setTimeout(() => {
      this.feedbackAiService.analyzeSentiment(this.feedbackForm.commentaire, this.feedbackForm.note).subscribe({
        next: (sentiment) => {
          this.createSentiment = sentiment;
          this.cdr.detectChanges();
        },
        error: () => {
          this.createSentiment = this.feedbackAiService.buildFallbackSentiment(this.feedbackForm.note);
          this.cdr.detectChanges();
        },
      });
    }, 300);
  }

  private scheduleCreateModerationAnalysis(): void {
    if (this.createModerationTimer) {
      clearTimeout(this.createModerationTimer);
    }

    this.createModerationTimer = setTimeout(() => {
      this.feedbackAiService.analyzeModeration(this.feedbackForm.commentaire).subscribe({
        next: (analysis) => {
          this.createModeration = analysis;
          this.cdr.detectChanges();
        },
        error: () => {
          this.createModeration = { ...EMPTY_MODERATION_ANALYSIS };
          this.cdr.detectChanges();
        },
      });
    }, 300);
  }

  private scheduleUpdateSentimentAnalysis(): void {
    if (this.updateSentimentTimer) {
      clearTimeout(this.updateSentimentTimer);
    }

    this.updateSentimentTimer = setTimeout(() => {
      this.feedbackAiService.analyzeSentiment(this.updateForm.commentaire, this.updateForm.note).subscribe({
        next: (sentiment) => {
          this.updateSentiment = sentiment;
          this.cdr.detectChanges();
        },
        error: () => {
          this.updateSentiment = this.feedbackAiService.buildFallbackSentiment(this.updateForm.note);
          this.cdr.detectChanges();
        },
      });
    }, 300);
  }

  private scheduleUpdateModerationAnalysis(): void {
    if (this.updateModerationTimer) {
      clearTimeout(this.updateModerationTimer);
    }

    this.updateModerationTimer = setTimeout(() => {
      this.feedbackAiService.analyzeModeration(this.updateForm.commentaire).subscribe({
        next: (analysis) => {
          this.updateModeration = analysis;
          this.cdr.detectChanges();
        },
        error: () => {
          this.updateModeration = { ...EMPTY_MODERATION_ANALYSIS };
          this.cdr.detectChanges();
        },
      });
    }, 300);
  }

  private analyzeFeedbackSentiments(): void {
    this.feedbackSentiments = {};

    (this.feedbacks || []).forEach((feedback) => {
      const feedbackId = Number(feedback?.id ?? 0);
      const commentaire = String(feedback?.commentaire ?? '').trim();
      if (!feedbackId || !commentaire) {
        return;
      }

      this.feedbackAiService.analyzeSentiment(commentaire, feedback.note).subscribe({
        next: (sentiment) => {
          this.feedbackSentiments[feedbackId] = sentiment;
          this.cdr.detectChanges();
        },
        error: () => {
          this.feedbackSentiments[feedbackId] = this.feedbackAiService.buildFallbackSentiment(feedback.note);
          this.cdr.detectChanges();
        },
      });
    });
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
    this.formErrorMessage = '';
  }

  closeWarningDialog(): void {
    this.warningDialogOpen = false;
  }

  private refreshFeedbacksAfterMutation(successMessage: string): void {
    this.resetMessages();
    this.successMessage = successMessage;
    this.loadFeedbacks();
    this.loadUserReservations();
    setTimeout(() => {
      this.loadFeedbacks();
      this.loadUserReservations();
    }, 700);
    this.cdr.detectChanges();
  }

  private handleMutationResult(
    result: FeedbackMutationResult,
    fallbackSuccessMessage: string,
    originalCommentaire: string = '',
  ): void {
    if (result.containsBadWords && !result.success) {
      this.warningMessage = this.warningModerationMessage;
      this.openWarningDialog(this.warningMessage, originalCommentaire);
      this.loadFeedbacks();
      this.loadUserReservations();
      this.cdr.detectChanges();
      return;
    }

    this.refreshFeedbacksAfterMutation(result.message || fallbackSuccessMessage);

    if (result.containsBadWords) {
      this.warningMessage = this.warningModerationMessage;
      this.openWarningDialog(this.warningMessage, originalCommentaire);
      this.cdr.detectChanges();
    }
  }

  private handleMutationError(error: any, action: 'create' | 'update'): void {
    const backendPayload = error?.error ?? {};
    const containsBadWords = Boolean(backendPayload?.containsBadWords ?? backendPayload?.badWordsDetected ?? false);
    const message = this.getRequestErrorMessage(error, action);
    const fallbackComment = this.editMode ? this.updateForm.commentaire : this.feedbackForm.commentaire;

    if (containsBadWords) {
      this.warningMessage = this.warningModerationMessage;
      this.openWarningDialog(this.warningMessage, fallbackComment);
      return;
    }

    this.errorMessage = message;
  }

  private openWarningDialog(message: string, commentaire: string = ''): void {
    this.warningDialogMessage = message || this.warningModerationMessage;
    this.warningDialogComment = (commentaire || '').trim();
    this.warningDialogOpen = true;
  }

  private scrollToFeedbackList(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      document.getElementById('feedback-list')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  private normalizeFeedbackResponse(
    feedback: Partial<FeedbackResponse> | null | undefined,
    fallback: {
      id?: number;
      userId: number;
      filmId: number;
      commentaire: string;
      note: number;
      date?: string | null;
    }
  ): FeedbackResponse {
    return {
      id: feedback?.id ?? fallback.id ?? Date.now(),
      userId: feedback?.userId ?? fallback.userId,
      filmId: feedback?.filmId ?? fallback.filmId,
      commentaire: feedback?.commentaire ?? fallback.commentaire,
      note: feedback?.note ?? fallback.note,
      date: feedback?.date ?? fallback.date ?? new Date().toISOString().slice(0, 10),
    };
  }

  private getRequestErrorMessage(error: any, action: 'loading' | 'create' | 'update' | 'deletion'): string {
    const backendMessage = error?.error?.message || error?.error?.error || error?.message || '';
    const normalized = String(backendMessage).toLowerCase();

    if (error?.status === 0) {
      return 'Unable to connect to server. Verify backend is running and try again.';
    }

    if (normalized.includes('bad word') || normalized.includes('inappropr') || normalized.includes('forbidden word')) {
      return backendMessage || 'Message was rejected because it contains inappropriate terms. A warning email was sent.';
    }

    if (error?.status === 400) {
      return backendMessage || 'Submitted data is invalid. Check movie, rating, and comment.';
    }

    if (error?.status === 403) {
      return 'This action is not authorized for your account.';
    }

    if (error?.status === 404) {
      return 'Requested resource was not found.';
    }

    if (error?.status === 409) {
      return backendMessage || 'An identical operation already exists or conflicts.';
    }

    if (backendMessage) {
      return backendMessage;
    }

    switch (action) {
      case 'loading':
        return 'Error loading feedback.';
      case 'create':
        return 'Error while submitting feedback.';
      case 'update':
        return 'Error while updating feedback.';
      case 'deletion':
        return 'Error while deleting feedback.';
      default:
        return 'An unexpected error occurred.';
    }
  }
}


