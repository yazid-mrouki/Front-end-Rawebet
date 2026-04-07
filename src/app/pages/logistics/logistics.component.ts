import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics.component.html'
})
export class LogisticsComponent {
  activeTab: 'inventory' | 'requests' = 'inventory';

  inventory = [
    { name: 'Projector HD', category: 'AV Equipment', status: 'Available', qty: 4, emoji: '📽️' },
    { name: 'Sound System 500W', category: 'AV Equipment', status: 'In Use', qty: 2, emoji: '🔊' },
    { name: 'Folding Chairs', category: 'Furniture', status: 'Available', qty: 200, emoji: '🪑' },
    { name: 'Stage Lighting Kit', category: 'Lighting', status: 'Available', qty: 6, emoji: '💡' },
    { name: 'Portable Screen', category: 'AV Equipment', status: 'Maintenance', qty: 1, emoji: '🖥️' },
    { name: 'Microphone Set (Wireless)', category: 'AV Equipment', status: 'Available', qty: 8, emoji: '🎤' },
    { name: 'Banners & Signage', category: 'Decor', status: 'Available', qty: 15, emoji: '🏷️' },
    { name: 'Catering Trays', category: 'Catering', status: 'Available', qty: 30, emoji: '🍽️' }
  ];

  requests = [
    { id: 'REQ-001', item: 'Projector HD', event: 'Film Festival', requestedBy: 'Cinema Club', date: 'June 3, 2026', status: 'Pending' },
    { id: 'REQ-002', item: 'Sound System 500W', event: 'Music Evening', requestedBy: 'Music Ensemble', date: 'July 1, 2026', status: 'Approved' },
    { id: 'REQ-003', item: 'Folding Chairs x50', event: 'Comedy Night', requestedBy: 'Events Team', date: 'June 23, 2026', status: 'Pending' }
  ];

  getStatusClass(status: string): string {
    switch(status) {
      case 'Available': return 'bg-green-50 text-green-600';
      case 'In Use': return 'bg-blue-50 text-blue-600';
      case 'Maintenance': return 'bg-orange-50 text-orange-600';
      case 'Approved': return 'bg-green-50 text-green-600';
      case 'Pending': return 'bg-yellow-50 text-yellow-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }
}
