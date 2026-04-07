import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent {
  user = {
    fullName: 'Ahmed Ben Ali',
    email: 'ahmed.benali@email.com',
    phone: '+216 27 099 512',
    joinDate: 'January 2025',
    tier: 'Gold',
    points: 2450
  };

  stats = [
    { label: 'Events Attended', value: 23, icon: '🎭' },
    { label: 'Films Watched', value: 15, icon: '🎬' },
    { label: 'Clubs Joined', value: 3, icon: '👥' },
    { label: 'Tickets Purchased', value: 38, icon: '🎟️' }
  ];
}
