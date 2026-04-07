import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-loyalty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-loyalty.component.html'
})
export class AdminLoyaltyComponent {
  tiers = [
    { name: 'Platinum', min: 3000, members: 52, color: 'bg-purple-500', perks: 'All perks + VIP + 30% off' },
    { name: 'Gold', min: 2000, members: 184, color: 'bg-accent', perks: 'Priority seating + 20% off' },
    { name: 'Silver', min: 1000, members: 620, color: 'bg-gray-400', perks: '10% discount + early access' },
    { name: 'Bronze', min: 0, members: 9626, color: 'bg-orange-400', perks: 'Basic loyalty benefits' },
  ];

  recentRedemptions = [
    { user: 'Ahmed Ben Ali', reward: 'Free Film Ticket', points: 500, date: '2025-05-28' },
    { user: 'Fatma Saidi', reward: '20% Off Workshop', points: 300, date: '2025-05-27' },
    { user: 'Sami Trabelsi', reward: 'Free Drink Voucher', points: 150, date: '2025-05-26' },
    { user: 'Nour Hamdi', reward: 'Merchandise Discount', points: 250, date: '2025-05-25' },
    { user: 'Youssef Karim', reward: 'Priority Seating', points: 400, date: '2025-05-24' },
  ];
}
