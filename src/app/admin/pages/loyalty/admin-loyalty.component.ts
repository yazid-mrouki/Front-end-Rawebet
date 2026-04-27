import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteService } from '../../../core/services/carte.service';

@Component({
  selector: 'app-admin-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-loyalty.component.html'
})
export class AdminLoyaltyComponent implements OnInit {
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

  stats = {
    totalClients: 0,
    totalSilver: 0,
    totalGold: 0,
    totalVip: 0,
    'totalPointsDistribués': 0
  };

  topClients: Array<{ nom: string; email: string; points: number; level: string }> = [];

  addPointsForm = { userId: null as number | null, points: null as number | null };
  addPointsMessage = '';
  addPointsError = '';

  constructor(private carteService: CarteService) {}

  ngOnInit() {
    this.carteService.getStats().subscribe({ next: stats => this.stats = stats });
    this.carteService.getTop().subscribe({ next: top => this.topClients = top });
  }

  addPoints() {
    this.addPointsMessage = '';
    this.addPointsError = '';
    if (!this.addPointsForm.userId || !this.addPointsForm.points) return;
    this.carteService.addPoints(this.addPointsForm.userId, this.addPointsForm.points).subscribe({
      next: () => {
        this.addPointsMessage = `+${this.addPointsForm.points} points ajoutés à l'utilisateur ${this.addPointsForm.userId}.`;
        this.carteService.getStats().subscribe({ next: s => this.stats = s });
        this.carteService.getTop().subscribe({ next: t => this.topClients = t });
        this.addPointsForm = { userId: null, points: null };
      },
      error: (err) => this.addPointsError = err?.error?.message || 'Impossible d\'ajouter les points.'
    });
  }
}
