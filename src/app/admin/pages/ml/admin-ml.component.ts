import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import {
  MlService,
  AllPredictions,
  ClientScanRow,
  AutoActionResult,
} from '../../../core/services/ml.service';

@Component({
  selector: 'app-admin-ml',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-ml.component.html',
})
export class AdminMlComponent implements OnInit {
  activeTab = 'individual';

  // ── State général ─────────────────────────────────────────────────────
  users: any[] = [];
  loading = false;
  apiStatus: 'unknown' | 'online' | 'offline' = 'unknown';

  // ── Tab 1 : Analyse individuelle ──────────────────────────────────────
  mlLoading = false;
  selectedUserId: number | null = null;
  selectedUserName = '';
  predictions: AllPredictions | null = null;
  searchQuery = '';

  // ── Tab 2 : Vue globale (scan) ────────────────────────────────────────
  scanLoading = false;
  scanResults: ClientScanRow[] = [];
  scanFilter = 'all';
  scanSort: 'churn' | 'anomaly' | 'name' = 'churn';
  lastScanTime: Date | null = null;

  // ── Tab 3 : Alertes automatiques ──────────────────────────────────────
  alertsLog: Array<{
    time: Date;
    userId: number;
    nom: string;
    actions: string[];
    churnRisk: string;
    anomalyScore: number;
  }> = [];
  autoActionLoading = false;
  autoActionAllLoading = false;

  constructor(
    private userService: UserService,
    private mlService: MlService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.checkApiHealth();
    this.loadUsers();
  }

  checkApiHealth() {
    this.mlService.mlHealth().subscribe({
      next: (res: any) => {
        this.apiStatus = res ? 'online' : 'offline';
        this.cdr.markForCheck();
      },
      error: () => {
        this.apiStatus = 'offline';
        this.cdr.markForCheck();
      },
    });
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAllUsers(0, 100).subscribe({
      next: (page: any) => {
        this.users = (page.content || []).filter(
          (u: any) => u.roles?.includes('CLIENT') && !u.roles?.includes('SUPER_ADMIN'),
        );
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Tab 1 ──────────────────────────────────────────────────────────────
  analyzeUser(user: any) {
    this.selectedUserId = user.id;
    this.selectedUserName = user.nom || user.name || user.email;
    this.predictions = null;
    this.mlLoading = true;

    this.mlService.predictAll(user.id).subscribe({
      next: (result: any) => {
        this.predictions = result;
        this.mlLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.mlLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get filteredUsers() {
    if (!this.searchQuery.trim()) return this.users;
    const q = this.searchQuery.toLowerCase();
    return this.users.filter(
      (u) =>
        (u.nom || u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    );
  }

  // ── Tab 2 — Scan global ────────────────────────────────────────────────
  runScan() {
    this.scanLoading = true;
    this.scanResults = [];
    this.mlService.scanAllClients().subscribe({
      next: (rows: ClientScanRow[]) => {
        this.scanResults = rows;
        this.scanLoading = false;
        this.lastScanTime = new Date();
        this.cdr.markForCheck();
      },
      error: () => {
        this.scanLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get filteredScan(): ClientScanRow[] {
    let rows = [...this.scanResults];
    switch (this.scanFilter) {
      case 'HIGH':
        rows = rows.filter((r) => r.churnRisk === 'HIGH');
        break;
      case 'MEDIUM':
        rows = rows.filter((r) => r.churnRisk === 'MEDIUM');
        break;
      case 'anomaly':
        rows = rows.filter((r) => r.anomalyLabel === 'ANOMALY');
        break;
      case 'upgrade':
        rows = rows.filter((r) => r.willUpgrade);
        break;
    }
    switch (this.scanSort) {
      case 'churn':
        rows.sort((a, b) => b.churnProba - a.churnProba);
        break;
      case 'anomaly':
        rows.sort((a, b) => b.anomalyProba - a.anomalyProba);
        break;
      case 'name':
        rows.sort((a, b) => a.nom.localeCompare(b.nom));
        break;
    }
    return rows;
  }

  get scanStats() {
    const r = this.scanResults;
    return {
      total: r.length,
      highChurn: r.filter((x) => x.churnRisk === 'HIGH').length,
      anomalies: r.filter((x) => x.anomalyLabel === 'ANOMALY').length,
      upgrades: r.filter((x) => x.willUpgrade).length,
      avgChurn: r.length
        ? ((r.reduce((s, x) => s + x.churnProba, 0) / r.length) * 100).toFixed(1)
        : '0',
    };
  }

  // ── Tab 3 — Actions automatiques ──────────────────────────────────────
  runAutoAction(userId: number, nom: string) {
    this.autoActionLoading = true;
    this.mlService.autoAction(userId).subscribe({
      next: (result: any) => {
        this.autoActionLoading = false;
        if (result) {
          this.alertsLog.unshift({
            time: new Date(),
            userId,
            nom,
            actions: result.actions,
            churnRisk: result.churnRisk,
            anomalyScore: result.anomalyScore,
          });
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.autoActionLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  runAutoActionAll() {
    const targets = this.scanResults.filter(
      (r) => r.churnRisk === 'HIGH' || r.anomalyLabel === 'ANOMALY',
    );
    if (targets.length === 0) {
      alert("Aucun client à risque détecté. Lance d'abord le scan.");
      return;
    }

    this.autoActionAllLoading = true;
    let done = 0;

    for (const t of targets) {
      this.mlService.autoAction(t.userId).subscribe({
        next: (result: any) => {
          done++;
          if (result) {
            this.alertsLog.unshift({
              time: new Date(),
              userId: t.userId,
              nom: t.nom,
              actions: result.actions,
              churnRisk: result.churnRisk,
              anomalyScore: result.anomalyScore,
            });
          }
          if (done === targets.length) this.autoActionAllLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          done++;
          if (done === targets.length) this.autoActionAllLoading = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  get highRiskUsers() {
    return this.scanResults.filter((r) => r.churnRisk === 'HIGH' || r.anomalyLabel === 'ANOMALY');
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  getRiskColor(level: string): string {
    switch (level) {
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'VIP':
        return 'text-purple-700 bg-purple-50';
      case 'GOLD':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getRewardLabel(reward: string): string {
    switch (reward) {
      case 'CINEMA_FREE':
        return 'Cinéma gratuit (200pts)';
      case 'EVENT_DISCOUNT':
        return 'Réduction événement (100pts)';
      case 'CLUB_DISCOUNT':
        return 'Réduction club (150pts)';
      default:
        return reward;
    }
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'BAN_TEMPORAIRE':
        return 'text-red-600 bg-red-50 border border-red-200';
      case 'SURVEILLANCE':
        return 'text-amber-600 bg-amber-50 border border-amber-200';
      default:
        return 'text-green-600 bg-green-50 border border-green-200';
    }
  }

  getActionBadgeColor(action: string): string {
    if (action.includes('BAN')) return 'bg-red-100 text-red-700';
    if (action.includes('EMAIL')) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  }

  getMediumCount(): number {
    return this.scanResults.filter((r) => r.churnRisk === 'MEDIUM').length;
  }

  getLowCount(): number {
    return this.scanResults.filter((r) => r.churnRisk === 'LOW').length;
  }

  pct(val: number): string {
    return (val * 100).toFixed(1) + '%';
  }
  fmt(val: number): string {
    return (val * 100).toFixed(0) + '%';
  }
}
