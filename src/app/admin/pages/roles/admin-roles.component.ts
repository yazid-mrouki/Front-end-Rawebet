import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RbacService } from '../../../core/services/rbac.service';
import { PermissionResponse, RoleResponse } from '../../../core/models/rbac.model';

interface EditRoleForm {
  id: number | null;
  name: string;
  permissions: string[];
}

type CrudAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

interface RoleCrudRow {
  action: CrudAction;
  label: string;
  cinema: string | null;
  club: string | null;
  event: string | null;
  fidelity: string | null;
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-roles.component.html',
})
export class AdminRolesComponent implements OnInit {
  roleForm = { name: '', permissions: [] as string[] };
  permissions: PermissionResponse[] = [];
  roles: RoleResponse[] = [];
  permissionsLoading = false;
  rolesLoading = false;
  showCreateRoleModal = false;

  roleMessage = '';
  roleError = '';
  creating = false;
  showEditRoleModal = false;
  editingRole: EditRoleForm = { id: null, name: '', permissions: [] };
  crudRows: RoleCrudRow[] = [];

  private readonly moduleOrder = ['CINEMA', 'CLUB', 'EVENT', 'FIDELITY'];
  private readonly actionOrder: CrudAction[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

  constructor(
    private rbacService: RbacService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
    this.loadRoles();
  }

  loadPermissions() {
    this.permissionsLoading = true;
    this.rbacService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions = (permissions || [])
          .filter((permission) => permission.name !== 'ADMIN_MANAGE')
          .sort((left, right) => {
            const byModule = (left.module || '').localeCompare(right.module || '');
            if (byModule !== 0) return byModule;
            const byAction = (left.action || '').localeCompare(right.action || '');
            if (byAction !== 0) return byAction;
            return (left.name || '').localeCompare(right.name || '');
          });
        this.buildCrudRows();
        this.permissionsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.roleError = err?.error?.message || 'Impossible de charger les permissions.';
        this.permissionsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadRoles() {
    this.rolesLoading = true;
    this.rbacService.getRoles().subscribe({
      next: (roles) => {
        this.roles = (roles || [])
          .slice()
          .sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }));
        this.rolesLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.roleError = err?.error?.message || 'Impossible de charger les rôles.';
        this.roles = [];
        this.rolesLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onPermissionToggle(permissionName: string, checked: boolean) {
    if (checked) {
      if (!this.roleForm.permissions.includes(permissionName)) {
        this.roleForm.permissions.push(permissionName);
      }
      return;
    }

    this.roleForm.permissions = this.roleForm.permissions.filter((permission) => permission !== permissionName);
  }

  openCreateRole() {
    this.roleMessage = '';
    this.roleError = '';
    this.roleForm = { name: '', permissions: [] };
    this.showCreateRoleModal = true;
  }

  closeCreateRole() {
    this.showCreateRoleModal = false;
    this.roleForm = { name: '', permissions: [] };
  }

  openEditRole(role: RoleResponse) {
    if (role.name === 'SUPER_ADMIN') {
      this.roleError = 'Le rôle SUPER_ADMIN ne peut pas être modifié ici.';
      return;
    }

    this.roleMessage = '';
    this.roleError = '';
    this.editingRole = {
      id: role.id,
      name: role.name,
      permissions: [...(role.permissions || [])],
    };
    this.showEditRoleModal = true;
  }

  closeEditRole() {
    this.showEditRoleModal = false;
    this.editingRole = { id: null, name: '', permissions: [] };
  }

  toggleEditPermission(permissionName: string, checked: boolean) {
    if (checked) {
      if (!this.editingRole.permissions.includes(permissionName)) {
        this.editingRole.permissions.push(permissionName);
      }
      return;
    }

    this.editingRole.permissions = this.editingRole.permissions.filter((permission) => permission !== permissionName);
  }

  saveRoleUpdate() {
    if (!this.editingRole.id) return;

    const roleName = (this.editingRole.name || '').trim().toUpperCase();
    const permissions = [...new Set((this.editingRole.permissions || []).map((permission) => permission.toUpperCase()))];

    this.roleMessage = '';
    this.roleError = '';

    if (!roleName) {
      this.roleError = 'Nom du rôle obligatoire.';
      return;
    }

    if (!permissions.length) {
      this.roleError = 'Sélectionne au moins une permission.';
      return;
    }

    this.creating = true;
    this.rbacService.updateRole(this.editingRole.id, { name: roleName, permissions }).subscribe({
      next: () => {
        this.roleMessage = `Rôle ${roleName} modifié avec succès.`;
        this.creating = false;
        this.closeEditRole();
        this.loadRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.roleError = err?.error?.message || 'Modification du rôle impossible.';
        this.creating = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteRole(role: RoleResponse) {
    if (role.name === 'SUPER_ADMIN') {
      this.roleError = 'Le rôle SUPER_ADMIN ne peut pas être supprimé ici.';
      return;
    }

    const confirmed = confirm(`Supprimer définitivement le rôle ${role.name} ?`);
    if (!confirmed) return;

    this.roleMessage = '';
    this.roleError = '';
    this.rbacService.deleteRole(role.id).subscribe({
      next: () => {
        this.roleMessage = `Rôle ${role.name} supprimé avec succès.`;
        this.loadRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.roleError = err?.error?.message || 'Suppression du rôle impossible.';
        this.cdr.detectChanges();
      },
    });
  }

  createCustomRole() {
    if (this.creating) return;

    this.roleMessage = '';
    this.roleError = '';

    const roleName = (this.roleForm.name || '').trim().toUpperCase();
    const permissions = [...new Set((this.roleForm.permissions || []).map((permission) => permission.toUpperCase()))];

    if (!roleName) {
      this.roleError = 'Nom du rôle obligatoire.';
      return;
    }

    if (!permissions.length) {
      this.roleError = 'Sélectionne au moins une permission.';
      return;
    }

    if (roleName === 'SUPER_ADMIN') {
      this.roleError = 'Le rôle SUPER_ADMIN ne peut pas être créé ici.';
      return;
    }

    this.creating = true;
    this.rbacService.createRole(roleName, permissions).subscribe({
      next: () => {
        this.roleMessage = `Rôle ${roleName} créé avec succès.`;
        this.roleForm = { name: '', permissions: [] };
        this.creating = false;
        this.showCreateRoleModal = false;
        this.loadRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.roleError = err?.error?.message || 'Création du rôle impossible.';
        this.creating = false;
        this.cdr.detectChanges();
      },
    });
  }

  getCellPermission(row: RoleCrudRow, module: 'cinema' | 'club' | 'event' | 'fidelity'): string {
    return row[module] || '—';
  }

  getCellStyle(permissionName: string | null): string {
    if (!permissionName || permissionName === '—') {
      return 'bg-gray-100 text-gray-400';
    }

    return 'bg-emerald-50 text-emerald-700';
  }

  private buildCrudRows() {
    const permissionsByModule = new Map<string, Map<CrudAction, string>>();
    this.moduleOrder.forEach((module) => permissionsByModule.set(module, new Map<CrudAction, string>()));

    this.permissions.forEach((permission) => {
      const moduleKey = (permission.module || '').toUpperCase();
      const actionKey = (permission.action || '').toUpperCase() as CrudAction;
      if (!this.moduleOrder.includes(moduleKey) || !this.actionOrder.includes(actionKey)) {
        return;
      }

      permissionsByModule.get(moduleKey)?.set(actionKey, permission.name);
    });

    this.crudRows = this.actionOrder.map((action) => ({
      action,
      label: this.getCrudLabel(action),
      cinema: permissionsByModule.get('CINEMA')?.get(action) || null,
      club: permissionsByModule.get('CLUB')?.get(action) || null,
      event: permissionsByModule.get('EVENT')?.get(action) || null,
      fidelity: permissionsByModule.get('FIDELITY')?.get(action) || null,
    }));
  }

  private getCrudLabel(action: CrudAction): string {
    switch (action) {
      case 'CREATE': return 'Create';
      case 'READ': return 'Read';
      case 'UPDATE': return 'Update';
      case 'DELETE': return 'Delete';
    }
  }
}
