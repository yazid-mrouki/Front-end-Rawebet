import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';

interface AdminUserViewModel {
  id: number;
  name: string;
  email: string;
  roles: string[];
  roleLabel: string;
  loyaltyLevel: string;
  loyaltyPoints: number;
  status: 'Active' | 'Suspended';
  isCurrentUser: boolean;
  isSuperAdmin: boolean;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  searchQuery = '';
  selectedRole = 'all';
  loading = false;
  actionLoadingId: number | null = null;

  showAddAdminForm = false;
  newAdminForm = { nom: '', email: '', password: '', role: [] as string[] };
  addAdminMessage = '';
  addAdminError = '';
  pageMessage = '';
  pageError = '';

  availableRoles = ['ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'];
  currentUserId: number | null = null;

  users: AdminUserViewModel[] = [];

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUserId = this.auth.getCurrentUserId();
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAllUsers().subscribe({
      next: (users: UserResponse[]) => {
        this.users = users.map((user) => this.mapUser(user));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError = err?.error?.message || 'Impossible de charger les utilisateurs.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  addAdmin() {
    this.addAdminMessage = '';
    this.addAdminError = '';

    if (!this.newAdminForm.nom || !this.newAdminForm.email || !this.newAdminForm.password) {
      this.addAdminError = 'Tous les champs sont obligatoires.';
      return;
    }

    if (!this.newAdminForm.role || this.newAdminForm.role.length === 0) {
      this.addAdminError = 'Sélectionne au moins un rôle.';
      return;
    }

    const roles = Array.isArray(this.newAdminForm.role) ? this.newAdminForm.role : [this.newAdminForm.role];

    this.userService.createUserByAdmin({
      nom: this.newAdminForm.nom,
      email: this.newAdminForm.email,
      password: this.newAdminForm.password,
      roles,
    }).subscribe({
      next: () => {
        this.addAdminMessage = `✅ Admin ${this.newAdminForm.nom} créé avec succès.`;
        this.newAdminForm = { nom: '', email: '', password: '', role: [] as string[] };
        this.showAddAdminForm = false;
        this.loadUsers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.addAdminError = err?.error?.message || "Impossible de créer l'admin.";
        this.cdr.detectChanges();
      },
    });
  }

  get filteredUsers() {
    return this.users.filter((user) => {
      const matchSearch = user.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        || user.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.selectedRole === 'all'
        || user.roles.some((role) => role === this.selectedRole);
      return matchSearch && matchRole;
    });
  }

  canBan(user: AdminUserViewModel): boolean {
    return !user.isCurrentUser && !user.isSuperAdmin && user.status === 'Active';
  }

  canUnban(user: AdminUserViewModel): boolean {
    return !user.isSuperAdmin && user.status === 'Suspended';
  }

  banUser(user: AdminUserViewModel) {
    if (!this.canBan(user)) return;
    this.pageMessage = '';
    this.pageError = '';
    this.actionLoadingId = user.id;

    this.userService.banUser(user.id).subscribe({
      next: () => {
        user.status = 'Suspended';
        this.pageMessage = `${user.name} a été banni immédiatement.`;
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError = err?.error?.message || 'Ban impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  unbanUser(user: AdminUserViewModel) {
    if (!this.canUnban(user)) return;
    this.pageMessage = '';
    this.pageError = '';
    this.actionLoadingId = user.id;

    this.userService.unbanUser(user.id).subscribe({
      next: () => {
        user.status = 'Active';
        this.pageMessage = `${user.name} a été réactivé.`;
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError = err?.error?.message || 'Réactivation impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  getRoleClass(roleLabel: string) {
    if (roleLabel.includes('SUPER_ADMIN')) return 'bg-red-50 text-red-600';
    if (roleLabel.includes('ADMIN')) return 'bg-primary/10 text-primary';
    return 'bg-gray-100 text-gray-600';
  }

  getStatusClass(status: string) {
    return status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500';
  }

  getTierColor(tier: string) {
    return tier === 'GOLD'
      ? 'text-accent'
      : tier === 'SILVER'
        ? 'text-gray-400'
        : tier === 'VIP'
          ? 'text-purple-500'
          : 'text-orange-600';
  }

  private mapUser(user: UserResponse): AdminUserViewModel {
    const roles = user.roles || [];
    return {
      id: user.id,
      name: user.nom,
      email: user.email,
      roles,
      roleLabel: roles.join(', ') || 'CLIENT',
      loyaltyLevel: user.loyaltyLevel || 'SILVER',
      loyaltyPoints: user.loyaltyPoints || 0,
      status: user.isActive ? 'Active' : 'Suspended',
      isCurrentUser: user.id === this.currentUserId,
      isSuperAdmin: roles.includes('SUPER_ADMIN'),
    };
  }
}