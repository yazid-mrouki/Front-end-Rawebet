import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteService } from '../../core/services/carte.service';
import { CarteFideliteResponse, FidelityHistoryResponse } from '../../core/models/carte.model';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loyalty.component.html'
})
export class LoyaltyComponent implements OnInit {
  carte: CarteFideliteResponse | null = null;
  history: FidelityHistoryResponse[] = [];
  rewards: any[] = [];
  redeemMessage = '';
  redeemError = '';
  loading = true;
  transferForm = { toUserId: null as number | null, points: null as number | null };
  transferMessage = '';
  transferError = '';

  tierConfig: Record<string, { label: string; icon: string; min: number; next: string; nextMin: number }> = {
    SILVER: { label: 'Silver', icon: '🥈', min: 0, next: 'GOLD', nextMin: 200 },
    GOLD: { label: 'Gold', icon: '🥇', min: 200, next: 'VIP', nextMin: 500 },
    VIP: { label: 'VIP', icon: '💎', min: 500, next: 'VIP', nextMin: 500 },
  };

  constructor(private carteService: CarteService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.carteService.getDashboard().subscribe({
      next: (dashboard) => {
        this.carte = dashboard.carte;
        this.history = dashboard.history || [];
        this.rewards = dashboard.rewards || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get currentTier() {
    return this.carte ? this.tierConfig[this.carte.level] : null;
  }

  get progressPercent(): number {
    if (!this.carte || !this.currentTier) return 0;
    if (this.carte.level === 'VIP') return 100;
    const range = this.currentTier.nextMin - this.currentTier.min;
    const progress = this.carte.points - this.currentTier.min;
    return Math.min(100, Math.round((progress / range) * 100));
  }

  get pointsToNext(): number {
    if (!this.carte || !this.currentTier || this.carte.level === 'VIP') return 0;
    return this.currentTier.nextMin - this.carte.points;
  }

  redeem(rewardType: string) {
    this.redeemMessage = '';
    this.redeemError = '';
    this.carteService.redeemReward(rewardType).subscribe({
      next: (res) => {
        this.redeemMessage = res.message;
        this.loadDashboard();
      },
      error: (err) => this.redeemError = err?.error?.message || 'Points insuffisants.'
    });
  }

  transfer() {
    this.transferMessage = '';
    this.transferError = '';
    if (!this.transferForm.toUserId || !this.transferForm.points) return;

    this.carteService.transferPoints(this.transferForm.toUserId, this.transferForm.points).subscribe({
      next: () => {
        this.transferMessage = 'Transfert effectué avec succès.';
        this.transferForm = { toUserId: null, points: null };
        this.loadDashboard();
      },
      error: (err) => this.transferError = err?.error?.message || 'Transfert impossible.'
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  formatPoints(points: number): string {
    return points >= 0 ? `+${points}` : `${points}`;
  }
}
