import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  user = {
    fullName: '',
    email: '',
    phone: '',
    joinDate: '',
    tier: '',
    points: 0
  };
  error = '';
  success = '';
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  passwordError = '';
  passwordSuccess = '';
  showPasswordToast = false;

  stats = [
    { label: 'Events Attended', value: 23, icon: '🎭' },
    { label: 'Films Watched', value: 15, icon: '🎬' },
    { label: 'Clubs Joined', value: 3, icon: '👥' },
    { label: 'Tickets Purchased', value: 38, icon: '🎟️' }
  ];

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.getMe().subscribe({
      next: (profile) => {
        this.user.fullName = profile.nom;
        this.user.email = profile.email;
      },
      error: () => {
        this.error = 'Impossible de charger le profil.';
      }
    });
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    this.userService.updateMe({ nom: this.user.fullName, email: this.user.email }).subscribe({
      next: (updated) => {
        this.user.fullName = updated.nom;
        this.user.email = updated.email;
        this.success = 'Profil mis à jour avec succès.';
      },
      error: () => this.error = 'Impossible de mettre à jour le profil.'
    });
  }

  changePassword() {
    this.passwordError = '';
    this.passwordSuccess = '';
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    const payload = { oldPassword: this.passwordForm.oldPassword, newPassword: this.passwordForm.newPassword };
    console.log('[Profile] changePassword: sending', payload);
    this.userService.changePassword(payload).subscribe({
      next: (res) => {
        console.log('[Profile] changePassword: success, server response:', res);
        const msg = typeof res === 'string' && res.trim() ? res : 'Mot de passe changé avec succès.';
        this.passwordSuccess = msg;
        this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        // Auto-dismiss confirmation after 4 seconds
        this.showPasswordToast = true;
        setTimeout(() => {
          this.passwordSuccess = '';
          this.showPasswordToast = false;
        }, 4000);
      },
      error: (err) => {
        console.error('[Profile] changePassword error', err);
        // If backend returns plain text error (responseType: 'text'), err.error will be a string
        if (typeof err?.error === 'string' && err.error.trim()) {
          this.passwordError = err.error;
        } else {
          this.passwordError = err?.error?.message || 'Ancien mot de passe incorrect.';
        }
      }
    });
  }
}
