import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import {
  CreateFeedbackRequest,
  FeedbackResponse,
  UpdateFeedbackRequest,
} from '../../../core/models/feedback.model';

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-feedback.component.html'
})
export class AdminFeedbackComponent implements OnInit {
  feedbacks: FeedbackResponse[] = [];
  loading = false;
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

  constructor(private readonly feedbackService: FeedbackService) {}

  ngOnInit(): void {
    this.loadFeedbacks();
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

  loadFeedbacks(): void {
    this.loading = true;
    this.resetMessages();

    this.feedbackService.getAll().subscribe({
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

  addFeedback(): void {
    if (!this.isCreateFormValid()) {
      this.formErrorMessage = 'Renseigne userId, filmId, une note entre 1 et 5 et un commentaire.';
      return;
    }

    this.resetMessages();
    this.feedbackService.add(this.feedbackForm).subscribe({
      next: () => {
        this.successMessage = 'Feedback ajoute avec succes.';
        this.feedbackForm = { userId: 0, filmId: 0, commentaire: '', note: 5 };
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
      userId: feedback.userId ?? 0,
      filmId: feedback.filmId ?? 0,
      commentaire: feedback.commentaire,
      note: feedback.note,
    };
  }

  updateFeedback(): void {
    if (!this.isUpdateFormValid()) {
      this.formErrorMessage = 'Renseigne userId, filmId, une note entre 1 et 5 et un commentaire.';
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
    this.updateForm = { id: 0, userId: 0, filmId: 0, commentaire: '', note: 5 };
  }

  private isCreateFormValid(): boolean {
    return this.feedbackForm.userId > 0
      && this.feedbackForm.filmId > 0
      && this.feedbackForm.note >= 1
      && this.feedbackForm.note <= 5
      && this.feedbackForm.commentaire.trim().length >= 3;
  }

  private isUpdateFormValid(): boolean {
    return this.updateForm.id > 0
      && this.updateForm.userId > 0
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
