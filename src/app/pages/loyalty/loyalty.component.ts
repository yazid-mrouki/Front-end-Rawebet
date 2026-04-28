import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteService } from '../../core/services/carte.service';
import {
  CarteFideliteResponse,
  FidelityHistoryResponse,
  TransferRecipientResponse,
} from '../../core/models/carte.model';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loyalty.component.html',
  changeDetection: ChangeDetectionStrategy.Default, // ← Default pour éviter le bug scroll
})
export class LoyaltyComponent implements OnInit {
  carte: CarteFideliteResponse | null = null;
  history: FidelityHistoryResponse[] = [];
  rewards: any[] = [];
  redeemMessage = '';
  redeemError = '';
  loadingCard = true;
  loadingHistory = true;
  loadingRewards = true;
  transferForm = { toUserId: null as number | null, points: null as number | null };
  transferRecipientQuery = '';
  transferRecipients: TransferRecipientResponse[] = [];
  selectedRecipient: TransferRecipientResponse | null = null;
  recipientsLoading = false;
  transferMessage = '';
  transferError = '';

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  tierKeys: string[] = ['SILVER', 'GOLD', 'VIP'];

  tierConfig: Record<
    string,
    { label: string; icon: string; min: number; next: string; nextMin: number }
  > = {
    SILVER: { label: 'Silver', icon: '🥈', min: 0, next: 'GOLD', nextMin: 200 },
    GOLD: { label: 'Gold', icon: '🥇', min: 200, next: 'VIP', nextMin: 500 },
    VIP: { label: 'VIP', icon: '💎', min: 500, next: 'VIP', nextMin: 500 },
  };

  constructor(
    private carteService: CarteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loadingHistory = true;
    this.loadingRewards = true;
    this.loadingCard = true;

    // ── Carte ──────────────────────────────────────────────────────
    this.carteService.getMaCarte().subscribe({
      next: (carte) => {
        this.carte = carte;
        this.loadingCard = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingCard = false;
        this.cdr.detectChanges();
      },
    });

    // ── Historique — FIX : l'API retourne une Page<>, on extrait .content ──
    this.carteService
      .getHistory()
      .pipe(
        map((response: any) => {
          // Si c'est une Page Spring (avec .content), on extrait le tableau
          if (response && Array.isArray(response.content)) {
            return response.content as FidelityHistoryResponse[];
          }
          // Sinon c'est déjà un tableau direct
          if (Array.isArray(response)) {
            return response as FidelityHistoryResponse[];
          }
          return [];
        }),
      )
      .subscribe({
        next: (history) => {
          this.history = history;
          this.loadingHistory = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.history = [];
          this.loadingHistory = false;
          this.cdr.detectChanges();
        },
      });

    // ── Récompenses ───────────────────────────────────────────────
    this.carteService.getRewards().subscribe({
      next: (rewards) => {
        this.rewards = rewards || [];
        this.loadingRewards = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.rewards = [];
        this.loadingRewards = false;
        this.cdr.detectChanges();
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
        this.carteService.clearCache();
        this.loadDashboard();
      },
      error: (err) => (this.redeemError = err?.error?.message || 'Points insuffisants.'),
    });
  }

  transfer() {
    this.transferMessage = '';
    this.transferError = '';
    if (!this.transferForm.toUserId || !this.transferForm.points) {
      this.transferError = 'Sélectionnez un destinataire puis indiquez les points.';
      return;
    }
    this.carteService
      .transferPoints(this.transferForm.toUserId, this.transferForm.points)
      .subscribe({
        next: () => {
          this.transferMessage = 'Transfert effectué avec succès.';
          this.transferForm = { toUserId: null, points: null };
          this.transferRecipientQuery = '';
          this.transferRecipients = [];
          this.selectedRecipient = null;
          this.carteService.clearCache();
          this.loadDashboard();
        },
        error: (err) => (this.transferError = err?.error?.message || 'Transfert impossible.'),
      });
  }

  onTransferRecipientQueryChange() {
    this.transferForm.toUserId = null;
    this.selectedRecipient = null;
    this.transferMessage = '';
    this.transferError = '';
    const query = this.transferRecipientQuery.trim();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (query.length < 2) {
      this.transferRecipients = [];
      this.recipientsLoading = false;
      return;
    }
    this.searchTimeout = setTimeout(() => {
      this.recipientsLoading = true;
      this.carteService.searchTransferRecipients(query).subscribe({
        next: (recipients) => {
          this.transferRecipients = recipients || [];
          this.recipientsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.transferRecipients = [];
          this.recipientsLoading = false;
          this.cdr.detectChanges();
        },
      });
    }, 250);
  }

  selectTransferRecipient(recipient: TransferRecipientResponse) {
    this.selectedRecipient = recipient;
    this.transferForm.toUserId = recipient.id;
    this.transferRecipientQuery = `${recipient.nom} (${recipient.email})`;
    this.transferRecipients = [];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  formatPoints(points: number): string {
    return points >= 0 ? `+${points}` : `${points}`;
  }
}
