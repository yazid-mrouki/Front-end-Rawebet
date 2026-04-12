import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

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
  editDraft = {
    fullName: '',
    email: '',
    phone: ''
  };
  error = '';
  success = '';
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  passwordError = '';
  passwordSuccess = '';
  showPasswordToast = false;
  showEditProfileModal = false;
  showChangePasswordModal = false;

  stats = [
    { label: 'Events Attended', value: 23, icon: '🎭' },
    { label: 'Films Watched', value: 15, icon: '🎬' },
    { label: 'Clubs Joined', value: 3, icon: '👥' },
    { label: 'Tickets Purchased', value: 38, icon: '🎟️' }
  ];

  constructor(
    private userService: UserService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.bootstrapProfileFromToken();
    this.loadProfile();
  }

  private bootstrapProfileFromToken() {
    this.user.fullName = this.auth.getCurrentUserName() || '';
    this.user.email = this.auth.getCurrentUserEmail() || '';
    this.user.tier = this.user.tier || 'SILVER';
    this.user.points = Number.isFinite(this.user.points) ? this.user.points : 0;
  }

  openEditProfileModal() {
    this.error = '';
    this.success = '';
    this.editDraft = {
      fullName: this.user.fullName,
      email: this.user.email,
      phone: this.user.phone,
    };
    this.showEditProfileModal = true;
  }

  closeEditProfileModal() {
    this.showEditProfileModal = false;
  }

  openChangePasswordModal() {
    this.passwordError = '';
    this.passwordSuccess = '';
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal() {
    this.showChangePasswordModal = false;
    this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordError = '';
  }

  loadProfile() {
    this.userService.getMe().subscribe({
      next: (profile) => {
        const payload = profile as unknown as Record<string, unknown>;

        // Backend responses can vary (nom/name/fullName). Keep UI populated with safe fallbacks.
        this.user.fullName = String(payload['nom'] || payload['name'] || payload['fullName'] || this.auth.getCurrentUserName() || '');
        this.user.email = String(payload['email'] || payload['mail'] || this.auth.getCurrentUserEmail() || '');
        this.user.tier = String(payload['loyaltyLevel'] || payload['level'] || 'SILVER').toUpperCase();
        this.user.points = Number(payload['loyaltyPoints'] || payload['points'] || 0);
        this.error = '';
      },
      error: () => {
        // Fallback to token identity so the profile section is never blank.
        this.bootstrapProfileFromToken();
        this.error = 'Impossible de charger le profil.';
      }
    });
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    this.userService.updateMe({ nom: this.editDraft.fullName, email: this.editDraft.email }).subscribe({
      next: (updated) => {
        this.user.fullName = updated.nom;
        this.user.email = updated.email;
        this.user.phone = this.editDraft.phone;
        this.success = 'Profil mis à jour avec succès.';
        this.showEditProfileModal = false;
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
        this.showChangePasswordModal = false;
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
