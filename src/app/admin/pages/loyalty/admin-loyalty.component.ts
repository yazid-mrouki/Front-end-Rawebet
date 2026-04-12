import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteService } from '../../../core/services/carte.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserResponse } from '../../../core/models/user.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-loyalty.component.html',
})
export class AdminLoyaltyComponent implements OnInit {
  tiers = [
    { name: 'VIP', min: 500, members: 0, color: 'bg-purple-500', perks: 'Tous les avantages + 30% de remise' },
    { name: 'Gold', min: 200, members: 0, color: 'bg-accent', perks: 'Accès prioritaire + 20% de remise' },
    { name: 'Silver', min: 0, members: 0, color: 'bg-gray-400', perks: '10% de remise + accès anticipé' },
  ];

  stats = {
    totalClients: 0,
    totalSilver: 0,
    totalGold: 0,
    totalVip: 0,
    totalPointsDistribues: 0,
  };

  topClients: Array<{ nom: string; email: string; points: number; level: string }> = [];
  users: UserResponse[] = [];
  currentUserId: number | null = null;

  addPointsForm = { target: '', points: null as number | null };
  selectedUser: UserResponse | null = null;
  addPointsMessage = '';
  addPointsError = '';
  addPointsLoading = false;
  loadingData = false;

  constructor(
    private carteService: CarteService,
    private userService: UserService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUserId = this.auth.getCurrentUserId();
    this.loadData();
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users || [];
        this.applyTopClientFilter();
        if (!this.loadingData && this.topClients.length === 0) {
          this.loadTopClients();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.users = [];
        this.applyTopClientFilter();
        this.cdr.detectChanges();
      },
    });
  }

  loadData() {
    this.loadingData = true;
    this.carteService.getAdminOverview()
      .pipe(finalize(() => {
        this.loadingData = false;
      }))
      .subscribe({
        next: ({ stats, topClients }) => {
          this.stats = stats;
          this.tiers[0].members = stats.totalVip || 0;
          this.tiers[1].members = stats.totalGold || 0;
          this.tiers[2].members = stats.totalSilver || 0;
          this.topClients = topClients || [];
          this.applyTopClientFilter();

          if (this.topClients.length === 0) {
            this.loadTopClients();
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.topClients = [];
          this.loadTopClients();
          this.cdr.detectChanges();
        },
      });
  }

  private loadTopClients() {
    this.carteService.getTop(10).subscribe({
      next: (topClients) => {
        this.topClients = topClients || [];
        this.applyTopClientFilter();
        this.cdr.detectChanges();
      },
      error: () => {
        this.topClients = [];
        this.cdr.detectChanges();
      },
    });
  }

  trackByTop(index: number, item: { email?: string; nom?: string }) {
    return item?.email || item?.nom || index;
  }

  private normalizeTarget(value: string) {
    return value.trim().toLowerCase();
  }

  get matchingUsers() {
    const query = this.normalizeTarget(this.addPointsForm.target);
    if (!query) return [];

    return this.users
      .filter((user) => {
        if (!this.isClientUser(user)) return false;
        const email = user.email.toLowerCase();
        const name = user.nom.toLowerCase();
        return email.includes(query) || name.includes(query);
      })
      .slice(0, 8);
  }

  selectUser(user: UserResponse) {
    this.selectedUser = user;
    this.addPointsForm.target = user.email;
    this.addPointsMessage = '';
    this.addPointsError = '';
  }

  clearSelectedUser() {
    this.selectedUser = null;
    this.addPointsForm.target = '';
    this.addPointsError = '';
  }

  onTargetInput(value: string) {
    if (this.selectedUser && value !== this.selectedUser.email) {
      this.selectedUser = null;
    }

    if (this.addPointsMessage || this.addPointsError) {
      this.addPointsMessage = '';
      this.addPointsError = '';
    }
  }

  onPointsInput() {
    if (this.addPointsMessage || this.addPointsError) {
      this.addPointsMessage = '';
      this.addPointsError = '';
    }
  }

  private applyTopClientFilter() {
    if (!this.topClients.length || !this.users.length) {
      return;
    }

    const allowedClientEmails = new Set(
      this.users
        .filter((user) => this.isClientUser(user))
        .map((user) => user.email.toLowerCase()),
    );

    this.topClients = this.topClients.filter((client) => allowedClientEmails.has(client.email.toLowerCase()));
  }

  private isClientUser(user: UserResponse): boolean {
    const roles = user.roles || [];
    return !roles.some((role) => role === 'SUPER_ADMIN' || role.startsWith('ADMIN_'));
  }

  private resolveUserId(target: string): number | null {
    const normalizedTarget = this.normalizeTarget(target);
    if (!normalizedTarget) return null;

    const exactEmailMatch = this.users.find((user) => user.email.toLowerCase() === normalizedTarget);
    if (exactEmailMatch) return exactEmailMatch.id;

    const exactNameMatch = this.users.find((user) => user.nom.toLowerCase() === normalizedTarget);
    if (exactNameMatch) return exactNameMatch.id;

    const partialMatches = this.matchingUsers;

    if (partialMatches.length === 1) return partialMatches[0].id;

    return null;
  }

  addPoints() {
    if (this.addPointsLoading) return;

    this.addPointsMessage = '';
    this.addPointsError = '';
    if (!this.addPointsForm.target || !this.addPointsForm.points) return;

    const points = this.addPointsForm.points as number;
    const userId = this.selectedUser?.id ?? this.resolveUserId(this.addPointsForm.target);

    if (!userId) {
      this.addPointsError = 'Utilisateur introuvable. Choisis un client dans la liste.';
      return;
    }

    if (this.currentUserId === userId) {
      this.addPointsError = 'Tu ne peux pas ajouter des points à ton propre compte.';
      return;
    }

    const targetUser = this.users.find((user) => user.id === userId);
    if (targetUser && !this.isClientUser(targetUser)) {
      this.addPointsError = 'Les points de fidélité ne peuvent être ajoutés qu’aux clients.';
      return;
    }

    this.addPointsLoading = true;

    this.carteService
      .addPoints(userId, points)
      .pipe(finalize(() => {
        this.addPointsLoading = false;
      }))
      .subscribe({
        next: () => {
          const matchedUser = this.users.find((user) => user.id === userId);
          const displayLabel = matchedUser ? `${matchedUser.nom} (${matchedUser.email})` : `#${userId}`;
          this.updateTopClientLocally(matchedUser, points);
          this.addPointsMessage = `✅ +${points} points ajoutés à ${displayLabel}.`;
          this.addPointsForm = { target: '', points: null };
          this.selectedUser = null;
        },
        error: (err) => {
          this.addPointsError = err?.error?.message || "Impossible d'ajouter les points.";
        },
      });
  }

  private updateTopClientLocally(targetUser: UserResponse | undefined, points: number) {
    if (!targetUser || !this.isClientUser(targetUser)) {
      return;
    }

    const email = targetUser.email.toLowerCase();
    const name = targetUser.nom.toLowerCase();
    const currentTopClient = this.topClients.find(
      (client) => client.email.toLowerCase() === email || client.nom.toLowerCase() === name,
    );

    if (currentTopClient) {
      currentTopClient.points += points;
    } else {
      this.topClients = [
        {
          nom: targetUser.nom,
          email: targetUser.email,
          points,
          level: (targetUser.loyaltyLevel || 'SILVER').toUpperCase(),
        },
        ...this.topClients,
      ];
    }

    this.topClients = [...this.topClients]
      .sort((left, right) => right.points - left.points)
      .slice(0, 10);
  }
}
