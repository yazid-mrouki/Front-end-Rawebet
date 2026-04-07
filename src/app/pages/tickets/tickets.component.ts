import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets.component.html'
})
export class TicketsComponent {
  activeTab: 'my-tickets' | 'purchase' = 'my-tickets';

  myTickets = [
    { id: 'TK-001', event: 'Champions League Final Watch Party', date: 'May 31, 2026', time: '8:00 PM', status: 'Active', emoji: '⚽', qrCode: 'RWBT-001-2026' },
    { id: 'TK-002', event: 'Indie Film Festival', date: 'June 5, 2026', time: '7:30 PM', status: 'Active', emoji: '🎬', qrCode: 'RWBT-002-2026' },
    { id: 'TK-003', event: 'Stand-Up Comedy Night', date: 'Mar 15, 2026', time: '9:00 PM', status: 'Used', emoji: '😂', qrCode: 'RWBT-003-2026' }
  ];
}
