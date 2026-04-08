import { Component } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent {
  model = { email: '', password: '' };
  error = '';
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  onSubmit() {
    this.error = '';
    this.auth.login(this.model).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }

        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const roles: string[] = payload.roles || [];
            const isAdmin = roles.some((r) =>
              ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_FORMATION'].includes(r),
            );
            this.router.navigate(isAdmin ? ['/admin'] : ['/home']);
          } else {
            this.router.navigate(['/home']);
          }
        } catch {
          this.router.navigate(['/home']);
        }
      },
      error: () => (this.error = 'Email ou mot de passe incorrect'),
    });


  }
}
