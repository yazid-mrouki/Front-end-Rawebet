import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-events.component.html'
})
export class AdminEventsComponent {
  searchQuery = '';
  selectedStatus = 'all';

  events = [
    { id: 1, name: 'Champions League Final Watch Party', type: 'Watch Party', date: '2025-05-31', time: '20:00', capacity: 200, sold: 156, price: 15, status: 'Upcoming' },
    { id: 2, name: 'Indie Film Festival', type: 'Film Premiere', date: '2025-06-05', time: '18:00', capacity: 120, sold: 78, price: 25, status: 'On Sale' },
    { id: 3, name: 'Acting Masterclass with Hiam Abbas', type: 'Workshop', date: '2025-06-12', time: '14:00', capacity: 30, sold: 18, price: 40, status: 'Open' },
    { id: 4, name: 'Comedy Night Stand-Up Special', type: 'Live Show', date: '2025-06-25', time: '21:00', capacity: 150, sold: 116, price: 20, status: 'On Sale' },
    { id: 5, name: 'Music Evening: Traditional Malouf', type: 'Concert', date: '2025-07-03', time: '19:30', capacity: 500, sold: 0, price: 30, status: 'Planning' },
    { id: 6, name: 'Photography Exhibition', type: 'Exhibition', date: '2025-07-10', time: '10:00', capacity: 100, sold: 42, price: 0, status: 'Open' },
    { id: 7, name: 'Script Writing Workshop', type: 'Workshop', date: '2025-07-18', time: '15:00', capacity: 25, sold: 12, price: 35, status: 'On Sale' },
  ];

  get filteredEvents() {
    return this.events.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.selectedStatus === 'all' || e.status === this.selectedStatus;
      return matchSearch && matchStatus;
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Upcoming': return 'bg-blue-50 text-blue-600';
      case 'On Sale': return 'bg-green-50 text-green-600';
      case 'Open': return 'bg-purple-50 text-purple-600';
      case 'Planning': return 'bg-yellow-50 text-yellow-700';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  deleteEvent(id: number) { this.events = this.events.filter(e => e.id !== id); }
}
