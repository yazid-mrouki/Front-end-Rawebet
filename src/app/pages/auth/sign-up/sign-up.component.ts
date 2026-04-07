import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './sign-up.component.html'
})
export class SignUpComponent {
  model = { fullName: '', email: '', password: '', confirmPassword: '' };
  showPassword = false;

  onSubmit() {
    console.log('Sign up:', this.model);
  }
}
