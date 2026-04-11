import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { UserService } from '../../core/services/user.service';
import { UserResponse } from '../../core/models/user.model';
import {
  CreateFeedbackRequest,
  FeedbackResponse,
  UpdateFeedbackRequest,
} from '../../core/models/feedback.model';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent implements OnInit {
  feedbacks: FeedbackResponse[] = [];
  loading = false;
  currentUser: UserResponse | null = null;
  currentUserId: number | null = null;
  currentUserLoading = false;
  currentUserLoaded = false;
  errorMessage = '';
  successMessage = '';
  formErrorMessage = '';
  editMode = false;

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
    private readonly userService: UserService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initializeCurrentUser();
    this.authService.authState.subscribe((authenticated) => {
      if (authenticated) {
        this.initializeCurrentUser();
      } else {
        this.currentUser = null;
        this.currentUserId = null;
        this.currentUserLoaded = false;
        this.feedbacks = [];
      }
    });
  }

  loadFeedbacks(): void {
    if (!this.currentUserLoaded) {
      this.feedbacks = [];
      return;
    }

    this.loading = true;
    this.feedbackService.getMine().subscribe({
      next: (data) => {
        this.feedbacks = data;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error ?? 'Erreur lors du chargement des feedbacks.';
      },
    });
  }

  addFeedback(form: NgForm): void {
    this.feedbackForm.userId = this.currentUserId ?? 0;

    if (!this.currentUserLoaded || !this.currentUserId) {
      this.errorMessage = "Impossible d'identifier l'utilisateur connecte.";
      return;
    }

    if (form.invalid || !this.isCreateFormValid()) {
      this.formErrorMessage = 'Il faut completer tous les champs du formulaire.';
      form.control.markAllAsTouched();
      return;
    }

    this.resetMessages();
    this.feedbackService.add(this.feedbackForm).subscribe({
      next: () => {
        this.successMessage = 'Feedback ajoute avec succes.';
        this.feedbackForm = {
          userId: this.currentUserId ?? 0,
          filmId: 0,
          commentaire: '',
          note: 5,
        };
        form.resetForm({
          filmId: 0,
          note: 5,
          commentaire: '',
        });
        this.loadFeedbacks();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? "Erreur lors de l'ajout du feedback.";
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
  }

  updateFeedback(form: NgForm): void {
    this.updateForm.userId = this.currentUserId ?? this.updateForm.userId;

    if (!this.currentUserLoaded || !this.currentUserId) {
      this.errorMessage = "Impossible d'identifier l'utilisateur connecte.";
      return;
    }

    if (form.invalid || !this.isUpdateFormValid()) {
      this.formErrorMessage = 'Il faut completer correctement les champs obligatoires.';
      form.control.markAllAsTouched();
      return;
    }

    this.resetMessages();
    this.feedbackService.update(this.updateForm).subscribe({
      next: () => {
        this.successMessage = 'Feedback mis a jour avec succes.';
        this.cancelEdit();
        this.loadFeedbacks();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Erreur lors de la mise a jour du feedback.';
      },
    });
  }

  deleteFeedback(id: number): void {
    this.resetMessages();
    this.feedbackService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Feedback supprime avec succes.';
        this.loadFeedbacks();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error ?? 'Erreur lors de la suppression du feedback.';
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
      return 'Le film est obligatoire.';
    }

    if (control.errors['min']) {
      return 'Le film doit avoir un identifiant superieur ou egal a 1.';
    }

    if (control.errors['max']) {
      return 'Le film doit avoir un identifiant inferieur ou egal a 9999.';
    }

    return 'Film invalide.';
  }

  getNoteErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'La note est obligatoire.';
    }

    if (control.errors['min']) {
      return 'La note minimale est 1.';
    }

    if (control.errors['max']) {
      return 'La note maximale est 5.';
    }

    return 'Note invalide.';
  }

  getCommentaireErrorMessage(control: NgModel | null | undefined): string {
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Le commentaire est obligatoire.';
    }

    if (control.errors['minlength']) {
      return 'Le commentaire doit contenir au moins 3 caracteres.';
    }

    if (control.errors['maxlength']) {
      return 'Le commentaire ne doit pas depasser 500 caracteres.';
    }

    return 'Commentaire invalide.';
  }

  private initializeCurrentUser(): void {
    const tokenUserId = this.authService.getCurrentUserId();
    if (tokenUserId) {
      this.currentUserId = tokenUserId;
      this.feedbackForm.userId = tokenUserId;
      this.updateForm.userId = tokenUserId;
      this.currentUserLoaded = true;
      this.loadFeedbacks();
      return;
    }

    if (this.currentUserLoading) {
      return;
    }

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
      },
      error: () => {
        this.currentUserLoading = false;
        this.currentUserLoaded = false;
        this.currentUser = null;
        this.currentUserId = null;
        this.feedbacks = [];
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

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.formErrorMessage = '';
  }
}
