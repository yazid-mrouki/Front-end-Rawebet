import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-clubs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-clubs.component.html'
})
export class AdminClubsComponent {
  searchQuery = '';

  clubs = [
    { id: 1, name: 'Cinema Club', leader: 'Fatma Saidi', members: 45, events: 12, founded: '2023-01', status: 'Active' },
    { id: 2, name: 'Theatre Workshop', leader: 'Ahmed Ben Ali', members: 28, events: 8, founded: '2023-03', status: 'Active' },
    { id: 3, name: 'Photography Collective', leader: 'Nour Hamdi', members: 32, events: 6, founded: '2023-06', status: 'Active' },
    { id: 4, name: 'Music Ensemble', leader: 'Sami Trabelsi', members: 20, events: 15, founded: '2024-01', status: 'Active' },
    { id: 5, name: 'Literature Circle', leader: 'Leila Bouzid', members: 18, events: 4, founded: '2024-04', status: 'Inactive' },
    { id: 6, name: 'Dance Troupe', leader: 'Youssef Karim', members: 22, events: 10, founded: '2024-07', status: 'Active' },
  ];

  get filteredClubs() { return this.clubs.filter(c => c.name.toLowerCase().includes(this.searchQuery.toLowerCase())); }
  deleteClub(id: number) { this.clubs = this.clubs.filter(c => c.id !== id); }
}
