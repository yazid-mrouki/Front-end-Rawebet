import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersComponent {
  searchQuery = '';
  selectedRole = 'all';

  users = [
    { id: 1, name: 'Ahmed Ben Ali', email: 'ahmed@email.com', role: 'Member', plan: 'Patron', joined: '2023-05-10', tier: 'Gold', status: 'Active' },
    { id: 2, name: 'Fatma Saidi', email: 'fatma@email.com', role: 'Member', plan: 'Culture Pass', joined: '2023-08-22', tier: 'Gold', status: 'Active' },
    { id: 3, name: 'Sami Trabelsi', email: 'sami@email.com', role: 'Member', plan: 'Culture Pass', joined: '2024-01-15', tier: 'Silver', status: 'Active' },
    { id: 4, name: 'Nour Hamdi', email: 'nour@email.com', role: 'Club Leader', plan: 'Explorer', joined: '2023-06-01', tier: 'Silver', status: 'Active' },
    { id: 5, name: 'Youssef Karim', email: 'youssef@email.com', role: 'Member', plan: 'Explorer', joined: '2024-03-20', tier: 'Bronze', status: 'Active' },
    { id: 6, name: 'Leila Bouzid', email: 'leila@email.com', role: 'Admin', plan: 'Patron', joined: '2022-11-01', tier: 'Platinum', status: 'Active' },
    { id: 7, name: 'Karim Saad', email: 'karim@email.com', role: 'Member', plan: 'Explorer', joined: '2025-01-05', tier: 'Bronze', status: 'Suspended' },
  ];

  get filteredUsers() {
    return this.users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || u.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.selectedRole === 'all' || u.role === this.selectedRole;
      return matchSearch && matchRole;
    });
  }

  getRoleClass(r: string) { return r === 'Admin' ? 'bg-primary/10 text-primary' : r === 'Club Leader' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'; }
  getStatusClass(s: string) { return s === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'; }
  getTierColor(t: string) { return t === 'Gold' ? 'text-accent' : t === 'Silver' ? 'text-gray-400' : t === 'Platinum' ? 'text-purple-500' : 'text-orange-600'; }
}
