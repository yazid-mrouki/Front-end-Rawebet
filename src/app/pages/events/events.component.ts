import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './events.component.html'
})
export class EventsComponent {
  categories = ['All', 'Watch Party', 'Film Premiere', 'Club Event', 'Exhibition', 'Concert', 'Live Show'];
  activeCategory = 'All';

  events = [
    { id: 1, title: 'Champions League Final Watch Party', category: 'Watch Party', date: 'May 31, 2026', time: '8:00 PM', location: 'Main Hall', price: 'Free', emoji: '⚽', spots: 45, totalSpots: 200, color: 'from-green-500 to-emerald-700' },
    { id: 2, title: 'Indie Film Festival – Opening Night', category: 'Film Premiere', date: 'June 5, 2026', time: '7:30 PM', location: 'Cinema Room A', price: '15 TND', emoji: '🎬', spots: 78, totalSpots: 120, color: 'from-primary to-primary-light' },
    { id: 3, title: 'Theatre Workshop: Acting Masterclass', category: 'Club Event', date: 'June 12, 2026', time: '10:00 AM', location: 'Workshop Space', price: '25 TND', emoji: '🎭', spots: 12, totalSpots: 30, color: 'from-accent to-yellow-500' },
    { id: 4, title: 'Art & Photography Exhibition', category: 'Exhibition', date: 'June 20, 2026', time: '9:00 AM', location: 'Gallery Wing', price: 'Free', emoji: '🖼️', spots: 150, totalSpots: 500, color: 'from-purple-600 to-indigo-700' },
    { id: 5, title: 'Stand-Up Comedy Night', category: 'Live Show', date: 'June 25, 2026', time: '9:00 PM', location: 'Main Stage', price: '20 TND', emoji: '😂', spots: 34, totalSpots: 150, color: 'from-pink-500 to-rose-700' },
    { id: 6, title: 'Cultural Music Evening', category: 'Concert', date: 'July 3, 2026', time: '7:00 PM', location: 'Outdoor Arena', price: '10 TND', emoji: '🎵', spots: 200, totalSpots: 500, color: 'from-blue-500 to-cyan-700' },
    { id: 7, title: 'World Cup 2026 – Semi Final', category: 'Watch Party', date: 'July 14, 2026', time: '9:00 PM', location: 'Main Hall', price: 'Free', emoji: '⚽', spots: 80, totalSpots: 200, color: 'from-green-500 to-emerald-700' },
    { id: 8, title: 'Documentary Screening: Ocean Life', category: 'Film Premiere', date: 'July 20, 2026', time: '6:00 PM', location: 'Cinema Room B', price: '10 TND', emoji: '🐳', spots: 60, totalSpots: 80, color: 'from-teal-500 to-teal-700' }
  ];

  get filteredEvents() {
    return this.activeCategory === 'All' ? this.events : this.events.filter(e => e.category === this.activeCategory);
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }
}
