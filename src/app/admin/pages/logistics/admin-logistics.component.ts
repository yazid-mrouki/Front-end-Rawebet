import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-logistics.component.html'
})
export class AdminLogisticsComponent {
  searchQuery = '';

  inventory = [
    { id: 1, name: 'HD Projector', category: 'AV Equipment', qty: 4, available: 2, condition: 'Good' },
    { id: 2, name: 'Sound System (PA)', category: 'AV Equipment', qty: 3, available: 1, condition: 'Good' },
    { id: 3, name: 'Folding Chairs', category: 'Furniture', qty: 200, available: 150, condition: 'Good' },
    { id: 4, name: 'Stage Lights (LED)', category: 'Lighting', qty: 12, available: 8, condition: 'Good' },
    { id: 5, name: 'Portable Screen', category: 'AV Equipment', qty: 2, available: 2, condition: 'New' },
    { id: 6, name: 'Microphone (Wireless)', category: 'AV Equipment', qty: 6, available: 4, condition: 'Good' },
    { id: 7, name: 'Exhibition Panels', category: 'Display', qty: 20, available: 15, condition: 'Fair' },
    { id: 8, name: 'Catering Tables', category: 'Furniture', qty: 15, available: 10, condition: 'Good' },
  ];

  requests = [
    { id: 'REQ-001', requester: 'Cinema Club', items: 'Projector + Screen', event: 'Film Screening', date: '2025-06-05', status: 'Approved' },
    { id: 'REQ-002', requester: 'Theatre Workshop', items: 'Stage Lights x4 + Sound System', event: 'Acting Show', date: '2025-06-12', status: 'Pending' },
    { id: 'REQ-003', requester: 'Music Ensemble', items: 'Sound System + Mics x3', event: 'Music Evening', date: '2025-07-03', status: 'Pending' },
    { id: 'REQ-004', requester: 'Photography Collective', items: 'Exhibition Panels x10', event: 'Photo Exhibition', date: '2025-07-10', status: 'Rejected' },
  ];

  get filteredInventory() { return this.inventory.filter(i => i.name.toLowerCase().includes(this.searchQuery.toLowerCase())); }
  getReqStatusClass(s: string) { return s === 'Approved' ? 'bg-green-50 text-green-600' : s === 'Pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-500'; }
}
