import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

  // ================= USER =================
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

  // ================= PASSWORD =================
  passwordForm = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  passwordError = '';
  passwordSuccess = '';
  showPasswordToast = false;

  // ================= STATS =================
  stats = [
    { label: 'Events Attended', value: 23, icon: '🎭' },
    { label: 'Films Watched', value: 15, icon: '🎬' },
    { label: 'Clubs Joined', value: 3, icon: '👥' },
    { label: 'Tickets Purchased', value: 38, icon: '🎟️' }
  ];

  // ================= SUBSCRIPTION =================
  userAbonnement: any = null;
  subscribedPlanId: number | null = null;
  loadingSubscription = false;
  subscriptionReady = false;

  constructor(
    private userService: UserService,
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  // ================= INIT =================
  ngOnInit() {
    this.loadProfile();
    this.loadSubscription();
  }

  // ================= PROFILE =================
  loadProfile() {
    this.userService.getMe().subscribe({
      next: (profile) => {
        this.user.fullName = profile.nom || '';
        this.user.email = profile.email || '';
      },
      error: () => {
        this.error = 'Impossible de charger le profil.';
      }
    });
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    this.userService.updateMe({
      nom: this.user.fullName,
      email: this.user.email
    }).subscribe({
      next: (updated) => {
        this.user.fullName = updated.nom;
        this.user.email = updated.email;
        this.success = 'Profil mis à jour avec succès.';
      },
      error: () => {
        this.error = 'Impossible de mettre à jour le profil.';
      }
    });
  }

  // ================= SUBSCRIPTION =================
  loadSubscription() {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.subscriptionReady = true;
      this.loadingSubscription = false;
      this.cd.markForCheck();
      return;
    }

    this.loadingSubscription = true;
    this.subscriptionReady = false;

    this.subscriptionService.getSubscriptionByUserId(userId).subscribe({
      next: (res) => {
        // backend returns ONE OBJECT (not array)
        this.userAbonnement = res;
        this.subscribedPlanId = res?.abonnementId || null;

        this.loadingSubscription = false;
        this.subscriptionReady = true;

        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Subscription error', err);
        this.userAbonnement = null;
        this.subscribedPlanId = null;

        this.loadingSubscription = false;
        this.subscriptionReady = true;

        this.cd.markForCheck();
      }
    });
  }

  // ================= GETTERS (UI CLEAN) =================
  get currentPlanName(): string {
    return this.userAbonnement?.abonnementName || 'No active plan';
  }

  get subscriptionExpiry(): string {
    return this.userAbonnement?.dateFin || '---';
  }

  get remainingTickets(): number | null {
    return this.userAbonnement?.ticketsRestants ?? null;
  }

  // ================= PASSWORD =================
  changePassword() {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const payload = {
      oldPassword: this.passwordForm.oldPassword,
      newPassword: this.passwordForm.newPassword
    };

    this.userService.changePassword(payload).subscribe({
      next: (res) => {
        this.passwordSuccess =
          typeof res === 'string' && res.trim()
            ? res
            : 'Mot de passe changé avec succès.';

        this.passwordForm = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        };

        this.showPasswordToast = true;

        setTimeout(() => {
          this.passwordSuccess = '';
          this.showPasswordToast = false;
        }, 4000);
      },
      error: (err) => {
        this.passwordError =
          typeof err?.error === 'string'
            ? err.error
            : err?.error?.message || 'Ancien mot de passe incorrect.';
      }
    });
  }
}