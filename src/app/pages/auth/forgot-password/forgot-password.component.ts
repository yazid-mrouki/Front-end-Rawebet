import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.message = '';
    this.error = '';
    const safeEmail = this.email.trim();
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.message = 'Si cet email existe, un code OTP vous a été envoyé.';
        this.router.navigate(['/auth/reset-password'], {
          queryParams: { email: safeEmail },
        });
      },
      error: () => this.error = 'Impossible d’envoyer le code OTP.'
    });
  }
}
