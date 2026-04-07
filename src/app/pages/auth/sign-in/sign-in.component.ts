import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './sign-in.component.html'
})
export class SignInComponent {
  model = { email: '', password: '' };
  showPassword = false;

  onSubmit() {
    console.log('Sign in:', this.model);
  }
}
