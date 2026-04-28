import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {
  // ── Wizard state ──────────────────────────────────────────────────
  currentStep: Step = 1;
  loading = false;

  // ── Model (identique à l'ancien — même appel auth.register()) ─────
  model = { fullName: '', email: '', password: '', confirmPassword: '' };

  // ── Erreurs par champ ─────────────────────────────────────────────
  error = '';
  fieldError = '';
  showPassword = false;
  showConfirm = false;

  constructor(private auth: AuthService, private router: Router) {}

  // ── Steps config ──────────────────────────────────────────────────
  get steps() {
    return [
      { num: 1, label: 'Nom' },
      { num: 2, label: 'Email' },
      { num: 3, label: 'Mot de passe' },
      { num: 4, label: 'Confirmation' },
    ];
  }

  get progressWidth(): string {
    return `${((this.currentStep - 1) / 3) * 100}%`;
  }

  // ── Validation par étape ──────────────────────────────────────────
  validateStep(): boolean {
    this.fieldError = '';
    switch (this.currentStep) {
      case 1:
        if (!this.model.fullName.trim()) {
          this.fieldError = 'Le nom est requis.';
          return false;
        }
        if (this.model.fullName.trim().length < 3) {
          this.fieldError = 'Le nom doit contenir au moins 3 caractères.';
          return false;
        }
        if (this.model.fullName.trim().length > 50) {
          this.fieldError = 'Le nom ne peut pas dépasser 50 caractères.';
          return false;
        }
        return true;

      case 2:
        if (!this.model.email.trim()) {
          this.fieldError = 'L\'email est requis.';
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.model.email.trim())) {
          this.fieldError = 'Veuillez entrer une adresse email valide.';
          return false;
        }
        return true;

      case 3:
        if (!this.model.password) {
          this.fieldError = 'Le mot de passe est requis.';
          return false;
        }
        if (this.model.password.length < 6) {
          this.fieldError = 'Le mot de passe doit contenir au moins 6 caractères.';
          return false;
        }
        if (!this.model.confirmPassword) {
          this.fieldError = 'Veuillez confirmer votre mot de passe.';
          return false;
        }
        if (this.model.password !== this.model.confirmPassword) {
          this.fieldError = 'Les mots de passe ne correspondent pas.';
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  // ── Password strength ─────────────────────────────────────────────
  get passwordStrength(): { level: 'weak' | 'medium' | 'strong'; label: string; color: string; width: string } {
    const p = this.model.password;
    if (!p) return { level: 'weak', label: '', color: 'bg-gray-200', width: '0%' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { level: 'weak', label: 'Faible', color: 'bg-red-400', width: '33%' };
    if (score <= 3) return { level: 'medium', label: 'Moyen', color: 'bg-yellow-400', width: '66%' };
    return { level: 'strong', label: 'Fort', color: 'bg-green-500', width: '100%' };
  }

  // ── Navigation ────────────────────────────────────────────────────
  next(): void {
    if (!this.validateStep()) return;
    if (this.currentStep < 4) {
      this.currentStep = (this.currentStep + 1) as Step;
      this.error = '';
    }
  }

  back(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as Step;
      this.fieldError = '';
      this.error = '';
    }
  }

  // ── Submit final — identique à l'ancien onSubmit() ────────────────
  onSubmit(): void {
    this.error = '';
    this.loading = true;
    this.auth
      .register({
        nom: this.model.fullName.trim(),
        email: this.model.email.trim(),
        password: this.model.password,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/auth/sign-in']);
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.error?.message ||
            err?.error?.error ||
            (typeof err?.error === 'string' ? err.error : '') ||
            'Impossible de créer le compte. Cet email est peut-être déjà utilisé.';
        },
      });
  }
}
