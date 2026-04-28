import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  code = '';
  password = '';
  confirmPassword = '';
  message = '';
  error = '';

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.error = '';
    const emailFromQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailFromQuery) {
      this.email = emailFromQuery;
    }
  }

  onSubmit() {
    if (!this.email || !this.code) {
      this.error = 'Email et code OTP obligatoires.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.error = '';
    this.auth.resetPasswordWithOtp(this.email, this.code, this.password).subscribe({
      next: () => {
        this.message = 'Mot de passe réinitialisé avec succès.';
        this.router.navigate(['/auth/sign-in']);
      },
      error: () => this.error = 'Impossible de réinitialiser le mot de passe.'
    });
  }
}
