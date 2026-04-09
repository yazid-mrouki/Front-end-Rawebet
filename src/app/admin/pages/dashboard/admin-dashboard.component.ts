import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { CarteService } from '../../../core/services/carte.service';
import { UserResponse } from '../../../core/models/user.model';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportUser extends UserResponse {
  createdAt?: string;
  dateInscription?: string;
}

interface ComparisonRow {
  metric: string;
  current: number;
  previous: number;
  deltaText: string;
  trend: 'up' | 'down' | 'flat';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  // KPI cards
  kpis = [
    { label: 'Total Clients', value: '0', change: 'live', trend: 'up', icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Active Events', value: '24', change: '+3', trend: 'up', icon: '🎭', color: 'from-purple-500 to-purple-600' },
    { label: 'Tickets Sold', value: '3,847', change: '+18.2%', trend: 'up', icon: '🎟️', color: 'from-accent to-yellow-500' },
    { label: 'Revenue (TND)', value: '48,250', change: '+8.7%', trend: 'up', icon: '💰', color: 'from-green-500 to-emerald-600' },
    { label: 'Active Clubs', value: '12', change: '+2', trend: 'up', icon: '👥', color: 'from-pink-500 to-rose-600' },
    { label: 'Subscriptions', value: '1,256', change: '+5.3%', trend: 'up', icon: '💳', color: 'from-primary to-primary-light' },
  ];

  // Revenue chart data (mock bars)
  revenueMonths = [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 45 },
    { month: 'Mar', value: 78 },
    { month: 'Apr', value: 52 },
    { month: 'May', value: 90 },
    { month: 'Jun', value: 72 },
    { month: 'Jul', value: 85 },
    { month: 'Aug', value: 60 },
    { month: 'Sep', value: 95 },
    { month: 'Oct', value: 70 },
    { month: 'Nov', value: 88 },
    { month: 'Dec', value: 100 },
  ];

  // Ticket distribution
  ticketCategories = [
    { name: 'Film Screenings', count: 1540, pct: 40, color: 'bg-blue-500' },
    { name: 'Watch Parties', count: 962, pct: 25, color: 'bg-green-500' },
    { name: 'Live Events', count: 770, pct: 20, color: 'bg-purple-500' },
    { name: 'Workshops', count: 385, pct: 10, color: 'bg-accent' },
    { name: 'Exhibitions', count: 190, pct: 5, color: 'bg-pink-500' },
  ];

  // Recent events
  recentEvents = [
    { name: 'Champions League Final', type: 'Watch Party', date: 'May 31', status: 'Upcoming', tickets: 156, capacity: 200, emoji: '⚽' },
    { name: 'Indie Film Festival', type: 'Film Premiere', date: 'Jun 5', status: 'On Sale', tickets: 78, capacity: 120, emoji: '🎬' },
    { name: 'Acting Masterclass', type: 'Workshop', date: 'Jun 12', status: 'Open', tickets: 18, capacity: 30, emoji: '🎭' },
    { name: 'Comedy Night', type: 'Live Show', date: 'Jun 25', status: 'On Sale', tickets: 116, capacity: 150, emoji: '😂' },
    { name: 'Music Evening', type: 'Concert', date: 'Jul 3', status: 'Planning', tickets: 0, capacity: 500, emoji: '🎵' },
  ];

  // Recent activity feed
  activityFeed = [
    { text: 'New user registered: Sami Trabelsi', time: '2 min ago', icon: '👤' },
    { text: 'Ticket purchased for Film Festival (x3)', time: '8 min ago', icon: '🎟️' },
    { text: 'Club "Cinema Club" added new member', time: '15 min ago', icon: '👥' },
    { text: 'Feedback submitted for Comedy Night (⭐⭐⭐⭐⭐)', time: '25 min ago', icon: '💬' },
    { text: 'Material request approved: Projector HD', time: '32 min ago', icon: '📦' },
    { text: 'Subscription renewed: Culture Pass (Ahmed)', time: '45 min ago', icon: '💳' },
    { text: 'New event created: Art Exhibition', time: '1 hour ago', icon: '🎭' },
    { text: 'Loyalty tier upgrade: Bronze → Silver (Fatma)', time: '1 hour ago', icon: '⭐' },
  ];

  // Top members
  topMembers: Array<{ name: string; points: number; tier: string; avatar: string; events: number }> = [];

  // Client tier distribution (reusing existing UI block)
  subscriptionData = [
    { plan: 'Silver', count: 0, pct: 0, color: 'bg-gray-400' },
    { plan: 'Gold', count: 0, pct: 0, color: 'bg-accent' },
    { plan: 'VIP', count: 0, pct: 0, color: 'bg-purple-500' },
  ];

  exportLoading = false;
  exportMessage = '';
  exportError = '';

  constructor(
    private userService: UserService,
    private carteService: CarteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadClientStats();
    this.loadTopMembers();
  }

  private loadClientStats() {
    this.carteService.getAdminOverview().subscribe({
      next: ({ stats }) => {
        const totalClients = stats?.totalClients || 0;
        const totalSilver = stats?.totalSilver || 0;
        const totalGold = stats?.totalGold || 0;
        const totalVip = stats?.totalVip || 0;

        this.kpis[0].value = totalClients.toLocaleString('fr-FR');
        this.subscriptionData = [
          {
            plan: 'Silver',
            count: totalSilver,
            pct: totalClients ? Math.round((totalSilver / totalClients) * 100) : 0,
            color: 'bg-gray-400',
          },
          {
            plan: 'Gold',
            count: totalGold,
            pct: totalClients ? Math.round((totalGold / totalClients) * 100) : 0,
            color: 'bg-accent',
          },
          {
            plan: 'VIP',
            count: totalVip,
            pct: totalClients ? Math.round((totalVip / totalClients) * 100) : 0,
            color: 'bg-purple-500',
          },
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  private loadTopMembers() {
    this.carteService.getTop(5).subscribe({
      next: (clients) => {
        const mapped = (clients || []).map((client) => ({
          name: client.nom,
          points: client.points,
          tier: this.formatTier(client.level),
          avatar: this.getAvatar(client.nom),
          events: 0,
        }));

        if (mapped.length) {
          this.topMembers = mapped;
          this.cdr.detectChanges();
          return;
        }

        // Fallback when top endpoint has no data: derive from client users list.
        this.userService.getAllUsers().subscribe({
          next: (users: UserResponse[]) => {
            this.topMembers = (users || [])
              .filter((user) => this.isClientUser(user))
              .sort((left, right) => (right.loyaltyPoints || 0) - (left.loyaltyPoints || 0))
              .slice(0, 5)
              .map((user) => ({
                name: user.nom,
                points: user.loyaltyPoints || 0,
                tier: this.formatTier(user.loyaltyLevel || 'SILVER'),
                avatar: this.getAvatar(user.nom),
                events: 0,
              }));
            this.cdr.detectChanges();
          },
          error: () => {
            this.topMembers = [];
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.topMembers = [];
        this.cdr.detectChanges();
      },
    });
  }

  private isClientUser(user: UserResponse): boolean {
    const roles = user.roles || [];
    return !roles.some((role) => role === 'SUPER_ADMIN' || role.startsWith('ADMIN_'));
  }

  private getAvatar(name: string): string {
    const value = (name || '').trim();
    return value ? value.charAt(0).toUpperCase() : '?';
  }

  private formatTier(level: string): string {
    const normalized = (level || '').toUpperCase();
    if (normalized === 'VIP') return 'VIP';
    if (normalized === 'GOLD') return 'Gold';
    return 'Silver';
  }

  exportReport() {
    if (this.exportLoading) return;

    this.exportMessage = '';
    this.exportError = '';
    this.exportLoading = true;
    this.cdr.detectChanges();

    forkJoin({
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as ExportUser[]))),
      overview: this.carteService.getAdminOverview().pipe(catchError(() => of({ stats: null, topClients: [] }))),
      topClients: this.carteService.getTop(10).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ users, overview, topClients }) => {
        const clientUsers = (users || []).filter((user) => this.isClientUser(user));

        const summaryRows = [
          { metric: 'Total clients', value: this.getKpiValue('Total Clients') },
          { metric: 'Tickets vendus', value: this.getKpiValue('Tickets Sold') },
          { metric: 'Revenus (TND)', value: this.getKpiValue('Revenue (TND)') },
          { metric: 'Abonnements', value: this.getKpiValue('Subscriptions') },
        ];

        const usersRows = clientUsers.map((user) => ({
          Nom: user.nom,
          Email: user.email,
          Role: (user.roles && user.roles.length ? user.roles.join(', ') : 'CLIENT'),
          'Date inscription': this.formatDate(user.createdAt || user.dateInscription),
        }));

        const topRows = (topClients || []).map((client) => ({
          Nom: client.nom,
          Email: client.email,
          Points: client.points,
          Niveau: this.formatTier(client.level),
        }));

        const stats = overview?.stats;
        const loyaltyRows = [
          { metric: 'Points distribués', value: stats?.totalPointsDistribues ?? 0 },
          { metric: 'Clients Silver', value: stats?.totalSilver ?? 0 },
          { metric: 'Clients Gold', value: stats?.totalGold ?? 0 },
          { metric: 'Clients VIP', value: stats?.totalVip ?? 0 },
        ];

        const comparisonRows = this.buildComparisonRows();
        const insightRows = this.buildInsightRows(comparisonRows, loyaltyRows, topRows);

        try {
          this.exportExcel(summaryRows, usersRows, topRows, loyaltyRows, comparisonRows, insightRows);

          // Small delay improves browser compatibility when triggering two downloads.
          setTimeout(() => {
            try {
              this.exportPdf(summaryRows, usersRows, topRows, loyaltyRows, comparisonRows, insightRows);
            } catch (error) {
              console.error('PDF export failed', error);
              this.exportError = 'Export PDF echoue. Verifie les permissions de telechargement du navigateur.';
            }

            this.exportLoading = false;
            if (!this.exportError) {
              this.exportMessage = 'Rapports exportes: PDF + Excel.';
            }
            this.cdr.detectChanges();
          }, 250);
        } catch (error) {
          console.error('Export failed', error);
          this.exportLoading = false;
          this.exportError = 'Export echoue. Ouvre la console navigateur pour le detail technique.';
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.exportLoading = false;
        this.exportError = 'Impossible de recuperer les donnees pour l export.';
        this.cdr.detectChanges();
      },
    });
  }

  private exportExcel(
    summaryRows: Array<{ metric: string; value: string | number }>,
    usersRows: Array<{ Nom: string; Email: string; Role: string; 'Date inscription': string }>,
    topRows: Array<{ Nom: string; Email: string; Points: number; Niveau: string }>,
    loyaltyRows: Array<{ metric: string; value: number }>,
    comparisonRows: ComparisonRow[],
    insightRows: Array<{ insight: string; detail: string }>,
  ) {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Rapport Admin - Resume Executif'],
      [`Genere le ${new Date().toLocaleString('fr-FR')}`],
      [],
      ['Indicateur', 'Valeur'],
      ...summaryRows.map((row) => [row.metric, row.value]),
    ]);
    const usersSheet = XLSX.utils.json_to_sheet(usersRows.length ? usersRows : [{ Nom: '-', Email: '-', Role: '-', 'Date inscription': '-' }]);
    const topSheet = XLSX.utils.json_to_sheet(topRows.length ? topRows : [{ Nom: '-', Email: '-', Points: 0, Niveau: '-' }]);
    const loyaltySheet = XLSX.utils.json_to_sheet(loyaltyRows);
    const comparisonSheet = XLSX.utils.json_to_sheet(
      comparisonRows.map((row) => ({
        Metrique: row.metric,
        Actuel: row.current,
        'Periode precedente': row.previous,
        Variation: row.deltaText,
        Tendance: row.trend === 'up' ? 'Hausse' : row.trend === 'down' ? 'Baisse' : 'Stable',
      })),
    );
    const insightsSheet = XLSX.utils.json_to_sheet(insightRows.map((row) => ({ Insight: row.insight, Detail: row.detail })));

    summarySheet['!cols'] = [{ wch: 36 }, { wch: 20 }];
    usersSheet['!cols'] = [{ wch: 24 }, { wch: 34 }, { wch: 22 }, { wch: 18 }];
    topSheet['!cols'] = [{ wch: 24 }, { wch: 34 }, { wch: 12 }, { wch: 12 }];
    loyaltySheet['!cols'] = [{ wch: 24 }, { wch: 16 }];
    comparisonSheet['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 12 }];
    insightsSheet['!cols'] = [{ wch: 30 }, { wch: 90 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resume');
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');
    XLSX.utils.book_append_sheet(workbook, topSheet, 'Fidelite Top');
    XLSX.utils.book_append_sheet(workbook, loyaltySheet, 'Fidelite Stats');
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparaison');
    XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights');

    XLSX.writeFile(workbook, `admin-report-${this.getTimestamp()}.xlsx`);
  }

  private exportPdf(
    summaryRows: Array<{ metric: string; value: string | number }>,
    usersRows: Array<{ Nom: string; Email: string; Role: string; 'Date inscription': string }>,
    topRows: Array<{ Nom: string; Email: string; Points: number; Niveau: string }>,
    loyaltyRows: Array<{ metric: string; value: number }>,
    comparisonRows: ComparisonRow[],
    insightRows: Array<{ insight: string; detail: string }>,
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const generatedAt = new Date().toLocaleString('fr-FR');

    doc.setFillColor(122, 29, 43);
    doc.rect(0, 0, 595, 78, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Rapport Admin - Performance Client', 40, 36);
    doc.setFontSize(10);
    doc.text(`Genere le ${generatedAt}`, 40, 56);
    doc.setTextColor(30, 30, 30);

    let startY = 92;

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.text('Executive Summary', 40, startY - 10);

    // Compact KPI cards for executive snapshot.
    comparisonRows.forEach((row, index) => {
      const x = 40 + (index % 2) * 260;
      const y = startY + Math.floor(index / 2) * 58;

      if (row.trend === 'up') {
        doc.setFillColor(236, 253, 245);
      } else if (row.trend === 'down') {
        doc.setFillColor(254, 242, 242);
      } else {
        doc.setFillColor(248, 250, 252);
      }

      doc.roundedRect(x, y, 240, 48, 8, 8, 'F');

      if (row.trend === 'up') {
        doc.setDrawColor(34, 197, 94);
      } else if (row.trend === 'down') {
        doc.setDrawColor(239, 68, 68);
      } else {
        doc.setDrawColor(203, 213, 225);
      }
      doc.roundedRect(x, y, 240, 48, 8, 8, 'S');

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(row.metric, x + 12, y + 17);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(String(row.current), x + 12, y + 35);

      doc.setFontSize(9);
      if (row.trend === 'up') {
        doc.setTextColor(22, 163, 74);
      } else if (row.trend === 'down') {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(100, 116, 139);
      }
      doc.text(`vs prev: ${row.deltaText}`, x + 145, y + 35);
    });

    autoTable(doc, {
      startY: startY + 130,
      head: [['Resume general', 'Valeur']],
      body: summaryRows.map((row) => [row.metric, String(row.value)]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [122, 29, 43] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Metrique', 'Actuel', 'Periode precedente', 'Variation', 'Tendance']],
      body: comparisonRows.map((row) => [
        row.metric,
        String(row.current),
        String(row.previous),
        row.deltaText,
        row.trend === 'up' ? 'Hausse' : row.trend === 'down' ? 'Baisse' : 'Stable',
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Nom', 'Email', 'Role', 'Date inscription']],
      body: (usersRows.length ? usersRows : [{ Nom: '-', Email: '-', Role: '-', 'Date inscription': '-' }]).map((row) => [
        row.Nom,
        row.Email,
        row.Role,
        row['Date inscription'],
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [122, 29, 43] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Top clients', 'Email', 'Points', 'Niveau']],
      body: (topRows.length ? topRows : [{ Nom: '-', Email: '-', Points: 0, Niveau: '-' }]).map((row) => [
        row.Nom,
        row.Email,
        String(row.Points),
        row.Niveau,
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 141, 63] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Carte fidelite', 'Valeur']],
      body: loyaltyRows.map((row) => [row.metric, String(row.value)]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [126, 34, 206] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Insights', 'Valeur ajoutee']],
      body: insightRows.map((row) => [row.insight, row.detail]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });

    doc.save(`admin-report-${this.getTimestamp()}.pdf`);
  }

  private buildComparisonRows(): ComparisonRow[] {
    return [
      this.buildComparisonRow('Total clients', this.getKpiNumericValue('Total Clients'), this.kpis[0].change),
      this.buildComparisonRow('Tickets vendus', this.getKpiNumericValue('Tickets Sold'), this.kpis[2].change),
      this.buildComparisonRow('Revenus (TND)', this.getKpiNumericValue('Revenue (TND)'), this.kpis[3].change),
      this.buildComparisonRow('Abonnements', this.getKpiNumericValue('Subscriptions'), this.kpis[5].change),
    ];
  }

  private buildComparisonRow(metric: string, current: number, changeText: string): ComparisonRow {
    const parsed = this.parseChange(changeText);

    if (!parsed) {
      return {
        metric,
        current,
        previous: current,
        deltaText: 'n/a',
        trend: 'flat',
      };
    }

    if (parsed.type === 'percent') {
      const previous = parsed.value >= 0
        ? current / (1 + parsed.value / 100)
        : current / (1 - Math.abs(parsed.value) / 100);
      return {
        metric,
        current,
        previous: Math.round(previous),
        deltaText: `${parsed.value > 0 ? '+' : ''}${parsed.value}%`,
        trend: parsed.value > 0 ? 'up' : parsed.value < 0 ? 'down' : 'flat',
      };
    }

    const previous = Math.max(0, current - parsed.value);
    return {
      metric,
      current,
      previous,
      deltaText: `${parsed.value > 0 ? '+' : ''}${parsed.value}`,
      trend: parsed.value > 0 ? 'up' : parsed.value < 0 ? 'down' : 'flat',
    };
  }

  private buildInsightRows(
    comparisonRows: ComparisonRow[],
    loyaltyRows: Array<{ metric: string; value: number }>,
    topRows: Array<{ Nom: string; Email: string; Points: number; Niveau: string }>,
  ): Array<{ insight: string; detail: string }> {
    const bestGrowth = [...comparisonRows].sort((a, b) => this.deltaScore(b.deltaText) - this.deltaScore(a.deltaText))[0];
    const vip = loyaltyRows.find((item) => item.metric === 'Clients VIP')?.value || 0;
    const gold = loyaltyRows.find((item) => item.metric === 'Clients Gold')?.value || 0;
    const silver = loyaltyRows.find((item) => item.metric === 'Clients Silver')?.value || 0;
    const totalTiered = vip + gold + silver;
    const premiumShare = totalTiered ? Math.round(((vip + gold) / totalTiered) * 100) : 0;
    const avgTopPoints = topRows.length
      ? Math.round(topRows.reduce((sum, row) => sum + row.Points, 0) / topRows.length)
      : 0;

    return [
      {
        insight: 'Croissance dominante',
        detail: bestGrowth ? `${bestGrowth.metric} montre la meilleure dynamique (${bestGrowth.deltaText} vs periode precedente).` : 'Aucune tendance exploitable disponible.',
      },
      {
        insight: 'Mix fidelite premium',
        detail: `Les segments Gold + VIP representent ${premiumShare}% de la base tiered, indicateur cle pour les offres a forte valeur.`,
      },
      {
        insight: 'Engagement top clients',
        detail: `Le top clients affiche une moyenne de ${avgTopPoints} points, utile pour calibrer les campagnes d upsell loyalty.`,
      },
      {
        insight: 'Action recommandee',
        detail: 'Lancer une campagne ciblee Silver -> Gold et mesurer impact sur tickets vendus et revenus sur 7 jours.',
      },
    ];
  }

  private deltaScore(deltaText: string): number {
    const cleaned = deltaText.replace('%', '').replace(',', '.').trim();
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private parseChange(changeText?: string): { type: 'percent' | 'absolute'; value: number } | null {
    if (!changeText) return null;
    const text = changeText.trim().toLowerCase();
    if (text === 'live' || text === 'n/a' || text === '-') return null;

    const normalized = text.replace(',', '.');
    const isPercent = normalized.includes('%');
    const numeric = Number(normalized.replace(/[^0-9+\-.]/g, ''));
    if (!Number.isFinite(numeric)) return null;

    return {
      type: isPercent ? 'percent' : 'absolute',
      value: numeric,
    };
  }

  private getKpiNumericValue(label: string): number {
    return this.parseNumber(this.getKpiValue(label));
  }

  private parseNumber(value: string): number {
    const normalized = (value || '').replace(/\s/g, '').replace(/,/g, '').replace(/[^0-9.-]/g, '');
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private getKpiValue(label: string): string {
    const item = this.kpis.find((kpi) => kpi.label === label);
    return item?.value || '0';
  }

  private formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR');
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'Upcoming': return 'bg-blue-50 text-blue-600';
      case 'On Sale': return 'bg-green-50 text-green-600';
      case 'Open': return 'bg-purple-50 text-purple-600';
      case 'Planning': return 'bg-yellow-50 text-yellow-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getTierColor(tier: string): string {
    switch(tier) {
      case 'VIP': return 'text-purple-500';
      case 'Gold': return 'text-accent';
      case 'Silver': return 'text-gray-400';
      case 'Platinum': return 'text-purple-500';
      default: return 'text-orange-600';
    }
  }
}
