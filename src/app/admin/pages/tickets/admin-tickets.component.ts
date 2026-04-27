import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-tickets.component.html'
})
export class AdminTicketsComponent {
  searchQuery = '';

  tickets = [
    { id: 'TKT-001', user: 'Ahmed Ben Ali', event: 'Champions League Final', qty: 2, total: 30, date: '2025-05-20', status: 'Valid' },
    { id: 'TKT-002', user: 'Fatma Saidi', event: 'Indie Film Festival', qty: 1, total: 25, date: '2025-05-22', status: 'Valid' },
    { id: 'TKT-003', user: 'Sami Trabelsi', event: 'Acting Masterclass', qty: 1, total: 40, date: '2025-05-23', status: 'Used' },
    { id: 'TKT-004', user: 'Nour Hamdi', event: 'Comedy Night', qty: 3, total: 60, date: '2025-05-24', status: 'Valid' },
    { id: 'TKT-005', user: 'Youssef Karim', event: 'Photography Exhibition', qty: 2, total: 0, date: '2025-05-25', status: 'Refunded' },
    { id: 'TKT-006', user: 'Leila Bouzid', event: 'Music Evening', qty: 4, total: 120, date: '2025-05-26', status: 'Valid' },
    { id: 'TKT-007', user: 'Karim Saad', event: 'Script Writing Workshop', qty: 1, total: 35, date: '2025-05-27', status: 'Cancelled' },
  ];

  get filteredTickets() {
    return this.tickets.filter(t => t.user.toLowerCase().includes(this.searchQuery.toLowerCase()) || t.event.toLowerCase().includes(this.searchQuery.toLowerCase()) || t.id.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  getStatusClass(s: string) {
    return s === 'Valid' ? 'bg-green-50 text-green-600' : s === 'Used' ? 'bg-blue-50 text-blue-600' : s === 'Refunded' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600';
  }
}
