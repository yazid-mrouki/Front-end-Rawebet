import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loyalty.component.html'
})
export class LoyaltyComponent {
  user = {
    name: 'Ahmed Ben Ali',
    tier: 'Gold',
    points: 2450,
    nextTier: 'Platinum',
    pointsToNext: 550,
    memberSince: 'January 2025'
  };

  tiers = [
    { name: 'Bronze', minPoints: 0, color: 'bg-orange-600', icon: '🥉' },
    { name: 'Silver', minPoints: 500, color: 'bg-gray-400', icon: '🥈' },
    { name: 'Gold', minPoints: 1500, color: 'bg-accent', icon: '🥇' },
    { name: 'Platinum', minPoints: 3000, color: 'bg-purple-600', icon: '💎' }
  ];

  recentActivity = [
    { action: 'Attended event: Comedy Night', points: '+50', date: 'Mar 20, 2026' },
    { action: 'Purchased ticket: Film Festival', points: '+30', date: 'Mar 15, 2026' },
    { action: 'Feedback submitted', points: '+10', date: 'Mar 12, 2026' },
    { action: 'Referred a friend', points: '+100', date: 'Mar 5, 2026' },
    { action: 'Monthly subscription bonus', points: '+200', date: 'Mar 1, 2026' }
  ];
}
