import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { RbacService } from '../../../core/services/rbac.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserSummaryResponse, BanRequest } from '../../../core/models/user.model';
import { RoleResponse } from '../../../core/models/rbac.model';

interface AdminUserViewModel {
  id: number;
  name: string;
  email: string;
  roles: string[];
  roleLabel: string;
  status: 'Active' | 'Suspended';
  banUntil: string | null;
  banReason: string | null;
  isCurrentUser: boolean;
  isSuperAdmin: boolean;
  createdAt?: string;
}

// ── Durée prédéfinie ──────────────────────────────────────────────────────
interface BanPreset {
  label: string;
  minutes: number | null; // null = permanent
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {

  searchQuery  = '';
  selectedRole = 'all';
  loading      = false;
  actionLoadingId: number | null = null;

  showAddAdminForm = false;
  newAdminForm = { nom: '', email: '', password: '', role: [] as string[] };
  editingUserId: number | null = null;
  editRoles: string[] = [];
  addAdminMessage = '';
  addAdminError   = '';
  pageMessage     = '';
  pageError       = '';

  currentPage   = 0;
  pageSize      = 20;
  totalPages    = 0;
  totalElements = 0;

  availableRoles:     string[] = ['ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'];
  editableRoleOptions: string[] = ['CLIENT', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'];
  roleFilterOptions:  string[] = ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB', 'CLIENT'];

  currentUserId: number | null = null;
  users: AdminUserViewModel[] = [];

  // ── Modal ban temporaire ───────────────────────────────────────────────
  showBanModal     = false;
  banTargetUser: AdminUserViewModel | null = null;

  banPresets: BanPreset[] = [
    { label: '30 minutes',  minutes: 30 },
    { label: '1 heure',     minutes: 60 },
    { label: '6 heures',    minutes: 360 },
    { label: '24 heures',   minutes: 1440 },
    { label: '3 jours',     minutes: 4320 },
    { label: '7 jours',     minutes: 10080 },
    { label: '30 jours',    minutes: 43200 },
    { label: 'Permanent',   minutes: null },
  ];

  // Formulaire modal
  banForm: {
    preset: number | null;
    reason: string;
    customDate: string;
    useCustomDate: boolean;
  } = {
    preset: 60,          // minutes sélectionnées (null = permanent)
    reason: '',
    customDate: '',
    useCustomDate: false,
  };

  constructor(
    private userService: UserService,
    private auth:        AuthService,
    private rbacService: RbacService,
    private toast:       ToastService,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUserId = this.auth.getCurrentUserId();
    this.loadUsers();
    this.loadRoles();
  }

  loadRoles() {
    this.rbacService.getRoles().subscribe({
      next: (roles: RoleResponse[]) => {
        const names = (roles || []).map(r => (r.name || '').toUpperCase()).filter(Boolean).sort();
        this.roleFilterOptions  = names;
        this.editableRoleOptions = names.filter(n => n !== 'SUPER_ADMIN');
        this.availableRoles      = this.editableRoleOptions.filter(n => n !== 'CLIENT');
        this.cdr.detectChanges();
      },
    });
  }

  loadUsers(page = 0) {
    this.loading = true;
    this.userService.getAllUsers(page, this.pageSize).subscribe({
      next: (result) => {
        this.users        = result.content.map(u => this.mapUser(u));
        this.currentPage  = result.number;
        this.totalPages   = result.totalPages;
        this.totalElements = result.totalElements;
        this.loading      = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError = err?.error?.message || 'Impossible de charger les utilisateurs.';
        this.loading   = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    this.loadUsers(page);
  }

  // ── Add admin ──────────────────────────────────────────────────────────
  addAdmin() {
    this.addAdminMessage = '';
    this.addAdminError   = '';
    if (!this.newAdminForm.nom || !this.newAdminForm.email || !this.newAdminForm.password) {
      this.addAdminError = 'Tous les champs sont obligatoires.'; return;
    }
    if (!this.newAdminForm.role?.length) {
      this.addAdminError = 'Sélectionne au moins un rôle.'; return;
    }
    const roles = Array.isArray(this.newAdminForm.role)
      ? this.newAdminForm.role : [this.newAdminForm.role];

    this.userService.createUserByAdmin({
      nom: this.newAdminForm.nom,
      email: this.newAdminForm.email,
      password: this.newAdminForm.password,
      roles,
    }).subscribe({
      next: () => {
        this.addAdminMessage = `Admin ${this.newAdminForm.nom} créé avec succès.`;
        this.newAdminForm    = { nom: '', email: '', password: '', role: [] };
        this.showAddAdminForm = false;
        this.loadUsers(this.currentPage);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.addAdminError = err?.error?.error || err?.error?.message || "Impossible de créer l'admin.";
        this.cdr.detectChanges();
      },
    });
  }

  // ── Filtres ────────────────────────────────────────────────────────────
  get filteredUsers() {
    return this.users.filter(u => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = this.selectedRole === 'all' || u.roles.includes(this.selectedRole);
      return matchSearch && matchRole;
    });
  }

  // ── Guards ─────────────────────────────────────────────────────────────
  canBan(u: AdminUserViewModel)      { return !u.isCurrentUser && !u.isSuperAdmin && u.status === 'Active'; }
  canUnban(u: AdminUserViewModel)    { return !u.isSuperAdmin && u.status === 'Suspended'; }
  canEditRoles(u: AdminUserViewModel){ return !u.isSuperAdmin; }
  canDeleteUser(u: AdminUserViewModel){ return !u.isCurrentUser && !u.isSuperAdmin; }

  // ── Edit roles ─────────────────────────────────────────────────────────
  startRoleEdit(user: AdminUserViewModel) {
    if (!this.canEditRoles(user)) return;
    this.pageMessage  = '';
    this.pageError    = '';
    this.editingUserId = user.id;
    this.editRoles    = [...user.roles];
  }

  cancelRoleEdit() { this.editingUserId = null; this.editRoles = []; }

  saveRoleEdit(user: AdminUserViewModel) {
    if (this.editingUserId !== user.id || !this.editRoles.length) return;
    const roles = [...new Set(this.editRoles.map(r => r.toUpperCase()))];
    this.actionLoadingId = user.id;
    this.userService.updateUserRoles(user.id, roles).subscribe({
      next: (updated) => {
        user.roles     = updated.roles || roles;
        user.roleLabel = user.roles.join(', ') || 'CLIENT';
        user.isSuperAdmin = user.roles.includes('SUPER_ADMIN');
        this.pageMessage  = `Rôles mis à jour pour ${user.name}.`;
        this.actionLoadingId = null;
        this.cancelRoleEdit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError    = err?.error?.error || err?.error?.message || 'Mise à jour impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  deleteUser(user: AdminUserViewModel) {
    if (!this.canDeleteUser(user) || !confirm(`Supprimer ${user.name} définitivement ?`)) return;
    this.actionLoadingId = user.id;
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users       = this.users.filter(u => u.id !== user.id);
        this.pageMessage = `${user.name} supprimé.`;
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError   = err?.error?.error || err?.error?.message || 'Suppression impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ── BAN MODAL ──────────────────────────────────────────────────────────
  openBanModal(user: AdminUserViewModel) {
    if (!this.canBan(user)) return;
    this.banTargetUser = user;
    this.banForm = { preset: 60 as number | null, reason: '', customDate: '', useCustomDate: false };
    this.showBanModal = true;
    this.pageMessage  = '';
    this.pageError    = '';
    this.cdr.detectChanges();
  }

  closeBanModal() {
    this.showBanModal  = false;
    this.banTargetUser = null;
    this.cdr.detectChanges();
  }

  confirmBan() {
    if (!this.banTargetUser) return;
    if (!this.banForm.reason.trim()) {
      this.pageError = 'La raison du ban est obligatoire.';
      this.cdr.detectChanges();
      return;
    }

    let banUntil: string | null = null;

    if (this.banForm.useCustomDate && this.banForm.customDate) {
      // Date personnalisée saisie par l'admin
      banUntil = new Date(this.banForm.customDate).toISOString().slice(0, 19);
    } else if (this.banForm.preset !== null && this.banForm.preset !== undefined) {
      // Calcul depuis les minutes prédéfinies
      const until = new Date(Date.now() + this.banForm.preset * 60000);
      banUntil = until.toISOString().slice(0, 19);
    }
    // banUntil = null → ban permanent

    const request: BanRequest = {
      banUntil,
      reason: this.banForm.reason.trim(),
    };

    const user = this.banTargetUser;
    this.actionLoadingId = user.id;
    this.closeBanModal();

    this.userService.banUser(user.id, request).subscribe({
      next: (updated) => {
        user.status   = 'Suspended';
        user.banUntil  = updated.banUntil ?? null;
        user.banReason = updated.banReason ?? null;
        this.pageMessage  = banUntil
          ? `${user.name} banni jusqu'au ${new Date(banUntil).toLocaleString('fr-FR')}.`
          : `${user.name} banni de manière permanente.`;
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError   = err?.error?.message || err?.error?.error || 'Ban impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ── UNBAN ──────────────────────────────────────────────────────────────
  unbanUser(user: AdminUserViewModel) {
    if (!this.canUnban(user)) return;
    this.actionLoadingId = user.id;
    this.userService.unbanUser(user.id).subscribe({
      next: () => {
        user.status    = 'Active';
        user.banUntil  = null;
        user.banReason = null;
        this.pageMessage  = `${user.name} réactivé.`;
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageError   = err?.error?.error || 'Réactivation impossible.';
        this.actionLoadingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers CSS ────────────────────────────────────────────────────────
  getRoleClass(roleLabel: string) {
    if (roleLabel.includes('SUPER_ADMIN')) return 'bg-red-50 text-red-600';
    if (roleLabel.includes('ADMIN'))       return 'bg-primary/10 text-primary';
    return 'bg-gray-100 text-gray-600';
  }

  getStatusClass(status: string) {
    return status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500';
  }

  formatBanUntil(banUntil: string | null): string {
    if (!banUntil) return 'Permanent';
    return new Date(banUntil).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Preset label ──────────────────────────────────────────────────────
  getSelectedPresetLabel(): string {
    if (this.banForm.useCustomDate) return 'Date personnalisée';
    const p = this.banPresets.find(x => x.minutes === this.banForm.preset);
    return p?.label ?? 'Permanent';
  }

  // ── Mapping ────────────────────────────────────────────────────────────
  private mapUser(user: UserSummaryResponse): AdminUserViewModel {
    const roles = user.roles || [];
    return {
      id:           user.id,
      name:         user.nom,
      email:        user.email,
      roles,
      roleLabel:    roles.join(', ') || 'CLIENT',
      status:       user.active ? 'Active' : 'Suspended',
      banUntil:     user.banUntil ?? null,
      banReason:    user.banReason ?? null,
      isCurrentUser: user.id === this.currentUserId,
      isSuperAdmin: roles.includes('SUPER_ADMIN'),
      createdAt:    user.createdAt,
    };
  }
}
