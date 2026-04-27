import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email = '';
  message = '';
  error = '';

  constructor(private auth: AuthService) {}

  onSubmit() {
    this.message = '';
    this.error = '';
    this.auth.forgotPassword(this.email).subscribe({
      next: () => this.message = 'Un lien de réinitialisation a été envoyé à votre adresse email.',
      error: () => this.error = 'Impossible d’envoyer le lien de réinitialisation.'
    });
  }
}
