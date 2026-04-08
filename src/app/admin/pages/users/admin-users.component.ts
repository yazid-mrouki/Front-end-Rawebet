import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersComponent implements OnInit {
  searchQuery = '';
  selectedRole = 'all';

  showAddAdminForm = false;
  newAdminForm = { nom: '', email: '', password: '', role: 'ADMIN_CINEMA' };
  addAdminMessage = '';
  addAdminError = '';

  availableRoles = ['ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_FORMATION'];

  users: Array<{ id: number; name: string; email: string; role: string; plan: string; joined: string; tier: string; status: string }> = [];

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loadUsers();
  }

  addAdmin() {
    this.addAdminMessage = '';
    this.addAdminError = '';
    this.userService.createUserByAdmin({
      nom: this.newAdminForm.nom,
      email: this.newAdminForm.email,
      password: this.newAdminForm.password,
      roles: [this.newAdminForm.role]
    }).subscribe({
      next: () => {
        this.addAdminMessage = `Admin ${this.newAdminForm.nom} créé avec succès.`;
        this.newAdminForm = { nom: '', email: '', password: '', role: 'ADMIN_CINEMA' };
        this.showAddAdminForm = false;
        this.loadUsers();
      },
      error: (err) => this.addAdminError = err?.error?.message || 'Impossible de créer l\'admin.'
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users: UserResponse[]) => {
        this.users = users.map(u => ({
          id: u.id,
          name: u.nom,
          email: u.email,
          role: u.roles?.[0] || 'Member',
          plan: 'Standard',
          joined: '2025-01-01',
          tier: 'Gold',
          status: u.isActive ? 'Active' : 'Suspended'
        }));
      }
    });
  }

  get filteredUsers() {
    return this.users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || u.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.selectedRole === 'all' || u.role === this.selectedRole;
      return matchSearch && matchRole;
    });
  }

  banUser(id: number) {
    this.userService.banUser(id).subscribe({
      next: () => this.loadUsers()
    });
  }

  unbanUser(id: number) {
    this.userService.unbanUser(id).subscribe({
      next: () => this.loadUsers()
    });
  }

  getRoleClass(r: string) { return r === 'Admin' ? 'bg-primary/10 text-primary' : r === 'Club Leader' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'; }
  getStatusClass(s: string) { return s === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'; }
  getTierColor(t: string) { return t === 'Gold' ? 'text-accent' : t === 'Silver' ? 'text-gray-400' : t === 'Platinum' ? 'text-purple-500' : 'text-orange-600'; }
}
