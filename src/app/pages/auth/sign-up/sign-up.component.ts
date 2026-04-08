import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './sign-up.component.html'
})
export class SignUpComponent {
  model = { fullName: '', email: '', password: '', confirmPassword: '' };
  error = '';
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (this.model.password !== this.model.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.error = '';
    this.auth.register({ nom: this.model.fullName, email: this.model.email, password: this.model.password })
      .subscribe({
        next: () => this.router.navigate(['/auth/sign-in']),
        error: () => this.error = 'Impossible de créer le compte.'
      });
  }
}
