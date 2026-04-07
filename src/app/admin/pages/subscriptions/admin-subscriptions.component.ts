import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-subscriptions.component.html'
})
export class AdminSubscriptionsComponent {
  searchQuery = '';

  stats = [
    { label: 'Explorer (Free)', count: 7200, pct: 69, color: 'bg-gray-300' },
    { label: 'Culture Pass', count: 2500, pct: 24, revenue: 47500, color: 'bg-primary' },
    { label: 'Patron', count: 782, pct: 7, revenue: 30498, color: 'bg-accent' },
  ];

  subscribers = [
    { id: 1, user: 'Ahmed Ben Ali', plan: 'Patron', started: '2024-11-15', renews: '2025-06-15', amount: 39, status: 'Active' },
    { id: 2, user: 'Fatma Saidi', plan: 'Culture Pass', started: '2025-01-20', renews: '2025-07-20', amount: 19, status: 'Active' },
    { id: 3, user: 'Sami Trabelsi', plan: 'Culture Pass', started: '2025-02-10', renews: '2025-08-10', amount: 19, status: 'Active' },
    { id: 4, user: 'Nour Hamdi', plan: 'Patron', started: '2024-09-05', renews: '2025-03-05', amount: 39, status: 'Expired' },
    { id: 5, user: 'Youssef Karim', plan: 'Culture Pass', started: '2025-04-01', renews: '2025-10-01', amount: 19, status: 'Active' },
    { id: 6, user: 'Leila Bouzid', plan: 'Patron', started: '2024-12-20', renews: '2025-06-20', amount: 39, status: 'Cancelled' },
  ];

  get filteredSubs() { return this.subscribers.filter(s => s.user.toLowerCase().includes(this.searchQuery.toLowerCase())); }
  getStatusClass(s: string) { return s === 'Active' ? 'bg-green-50 text-green-600' : s === 'Expired' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-500'; }
}
