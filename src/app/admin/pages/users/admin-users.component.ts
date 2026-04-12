import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { RbacService } from '../../../core/services/rbac.service';
import { RoleResponse } from '../../../core/models/rbac.model';

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
  editingUserId: number | null = null;
  editRoles: string[] = [];
  addAdminMessage = '';
  addAdminError = '';
  pageMessage = '';
  pageError = '';

  availableRoles: string[] = ['ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'];
  editableRoleOptions: string[] = ['CLIENT', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'];
  roleFilterOptions: string[] = ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB', 'CLIENT'];
  currentUserId: number | null = null;

  users: AdminUserViewModel[] = [];

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private rbacService: RbacService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUserId = this.auth.getCurrentUserId();
    this.loadUsers();
    this.loadRoles();
  }

  loadRoles() {
    this.rbacService.getRoles().subscribe({
      next: (roles: RoleResponse[]) => {
        const roleNames = (roles || [])
          .map((role) => (role.name || '').toUpperCase())
          .filter((roleName) => !!roleName)
          .sort((a, b) => a.localeCompare(b));

        this.roleFilterOptions = roleNames;
        this.editableRoleOptions = roleNames.filter((roleName) => roleName !== 'SUPER_ADMIN');
        this.availableRoles = this.editableRoleOptions.filter((roleName) => roleName !== 'CLIENT');

        this.cdr.detectChanges();
      },
      error: () => {
        // Keep static fallbacks if role loading fails.
      },
    });
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

  canEditRoles(user: AdminUserViewModel): boolean {
    return !user.isSuperAdmin;
  }

  canDeleteUser(user: AdminUserViewModel): boolean {
    return !user.isCurrentUser && !user.isSuperAdmin;
  }

  startRoleEdit(user: AdminUserViewModel) {
    if (!this.canEditRoles(user)) return;
    this.pageMessage = '';
    this.pageError = '';
    this.editingUserId = user.id;
    this.editRoles = [...user.roles];
  }

  cancelRoleEdit() {
    this.editingUserId = null;
    this.editRoles = [];
  }

  saveRoleEdit(user: AdminUserViewModel) {
    if (this.editingUserId !== user.id) return;
    if (!this.editRoles.length) {
      this.pageError = 'Sélectionne au moins un rôle.';
      return;
    }

    const roles = [...new Set(this.editRoles.map((role) => role.toUpperCase()))];
    this.actionLoadingId = user.id;
    this.pageMessage = '';
    this.pageError = '';

    this.userService.updateUserRoles(user.id, roles).subscribe({
      next: (updated: UserResponse) => {
        user.roles = updated.roles || roles;
        user.roleLabel = user.roles.join(', ') || 'CLIENT';
        user.isSuperAdmin = user.roles.includes('SUPER_ADMIN');
        this.pageMessage = `Rôles mis à jour pour ${user.name}.`;
        this.actionLoadingId = null;
        this.cancelRoleEdit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError = err?.error?.message || 'Mise à jour des rôles impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  deleteUser(user: AdminUserViewModel) {
    if (!this.canDeleteUser(user)) return;
    const confirmed = confirm(`Supprimer définitivement ${user.name} (${user.email}) ?`);
    if (!confirmed) return;

    this.actionLoadingId = user.id;
    this.pageMessage = '';
    this.pageError = '';

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== user.id);
        this.pageMessage = `${user.name} a été supprimé.`;
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError = err?.error?.message || 'Suppression impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
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
      status: user.active ? 'Active' : 'Suspended',
      isCurrentUser: user.id === this.currentUserId,
      isSuperAdmin: roles.includes('SUPER_ADMIN'),
    };
  }
}