import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteService } from '../../../core/services/carte.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserSummaryResponse } from '../../../core/models/user.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-loyalty.component.html'
})
export class AdminLoyaltyComponent implements OnInit {
  tiers = [
    {
      name: 'VIP',
      min: 500,
      members: 0,
      color: 'bg-purple-500',
      perks: 'Tous les avantages + 30% de remise',
    },
    {
      name: 'Gold',
      min: 200,
      members: 0,
      color: 'bg-accent',
      perks: 'Accès prioritaire + 20% de remise',
    },
    {
      name: 'Silver',
      min: 0,
      members: 0,
      color: 'bg-gray-400',
      perks: '10% de remise + accès anticipé',
    },
  ];

  stats = { totalClients: 0, totalSilver: 0, totalGold: 0, totalVip: 0, totalPointsDistribues: 0 };

  topClients: Array<{ nom: string; email: string; points: number; level: string }> = [];

  // CORRECTION — UserSummaryResponse au lieu de UserResponse
  users: UserSummaryResponse[] = [];
  currentUserId: number | null = null;

  addPointsForm = { target: '', points: null as number | null };
  selectedUser: UserSummaryResponse | null = null;
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

  // CORRECTION — getAllUsers() retourne Page<UserSummaryResponse>, on lit .content
  loadUsers() {
    this.userService.getAllUsers(0, 200).subscribe({
      next: (page) => {
        this.users = page.content || [];
        this.applyTopClientFilter();
        if (!this.loadingData && this.topClients.length === 0) {
          this.loadTopClients();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.users = [];
        this.applyTopClientFilter();
        this.cdr.markForCheck();
      },
    });
  }

  loadData() {
    this.loadingData = true;
    this.cdr.markForCheck();
    this.carteService.getAdminOverview().subscribe({
      next: ({ stats, topClients }) => {
        this.stats = stats;
        this.tiers[0].members = stats.totalVip || 0;
        this.tiers[1].members = stats.totalGold || 0;
        this.tiers[2].members = stats.totalSilver || 0;
        this.topClients = topClients || [];
        this.applyTopClientFilter();
        if (this.topClients.length === 0) {
          this.loadTopClients();
        } else {
          this.loadingData = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.topClients = [];
        this.loadTopClients();
      },
    });
  }

  private loadTopClients() {
    this.carteService.getTop(10).subscribe({
      next: (topClients) => {
        this.topClients = topClients || [];
        this.applyTopClientFilter();
        this.loadingData = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.topClients = [];
        this.loadingData = false;
        this.cdr.markForCheck();
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
        return user.email.toLowerCase().includes(query) || user.nom.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }

  selectUser(user: UserSummaryResponse) {
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
    if (this.selectedUser && value !== this.selectedUser.email) this.selectedUser = null;
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
    if (!this.topClients.length || !this.users.length) return;
    const allowedEmails = new Set(
      this.users.filter((u) => this.isClientUser(u)).map((u) => u.email.toLowerCase()),
    );
    this.topClients = this.topClients.filter((c) => allowedEmails.has(c.email.toLowerCase()));
  }

  private isClientUser(user: UserSummaryResponse): boolean {
    const roles = user.roles || [];
    return !roles.some((role) => role === 'SUPER_ADMIN' || role.startsWith('ADMIN_'));
  }

  private resolveUserId(target: string): number | null {
    const q = this.normalizeTarget(target);
    if (!q) return null;
    const exact =
      this.users.find((u) => u.email.toLowerCase() === q) ||
      this.users.find((u) => u.nom.toLowerCase() === q);
    if (exact) return exact.id;
    const partial = this.matchingUsers;
    return partial.length === 1 ? partial[0].id : null;
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
    const targetUser = this.users.find((u) => u.id === userId);
    if (targetUser && !this.isClientUser(targetUser)) {
      this.addPointsError = "Les points ne peuvent être ajoutés qu'aux clients.";
      return;
    }

    this.addPointsLoading = true;
    this.carteService
      .addPoints(userId, points)
      .pipe(
        finalize(() => {
          this.addPointsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          const matchedUser = this.users.find((u) => u.id === userId);
          const label = matchedUser ? `${matchedUser.nom} (${matchedUser.email})` : `#${userId}`;
          this.updateTopClientLocally(matchedUser, points);
          this.addPointsMessage = `+${points} points ajoutés à ${label}.`;
          this.addPointsForm = { target: '', points: null };
          this.selectedUser = null;
        },
        error: (err) => {
          this.addPointsError =
            err?.error?.error || err?.error?.message || "Impossible d'ajouter les points.";
        },
      });
  }

  private updateTopClientLocally(targetUser: UserSummaryResponse | undefined, points: number) {
    if (!targetUser || !this.isClientUser(targetUser)) return;
    const email = targetUser.email.toLowerCase();
    const existing = this.topClients.find((c) => c.email.toLowerCase() === email);
    if (existing) {
      existing.points += points;
    } else {
      // UserSummaryResponse n'a pas loyaltyLevel — on met SILVER par défaut
      this.topClients = [
        { nom: targetUser.nom, email: targetUser.email, points, level: 'SILVER' },
        ...this.topClients,
      ];
    }
    this.topClients = [...this.topClients].sort((a, b) => b.points - a.points).slice(0, 10);
  }
}
