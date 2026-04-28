import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { CarteService } from '../../../core/services/carte.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminActivityService, LiveActivity } from '../../../core/services/admin-activity.service';
import { FilterByTypePipe } from '../../../shared/pipes/filter-by-type.pipe';
import { catchError } from 'rxjs/operators';
import { forkJoin, of, Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportUser {
  id: number;
  nom: string;
  email: string;
  roles: string[];
  active: boolean;
  createdAt?: string;
}

interface ComparisonRow {
  metric: string;
  current: number;
  previous: number;
  deltaText: string;
  trend: 'up' | 'down' | 'flat';
}

type FeedFilter = 'all' | 'login' | 'register' | 'suspect' | 'ban' | 'loyalty';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FilterByTypePipe],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  kpis = [
    {
      label: 'Total Clients',
      value: '0',
      change: 'live',
      trend: 'up',
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Active Events',
      value: '24',
      change: '+3',
      trend: 'up',
      icon: '🎭',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Tickets Sold',
      value: '3,847',
      change: '+18.2%',
      trend: 'up',
      icon: '🎟️',
      color: 'from-accent to-yellow-500',
    },
    {
      label: 'Revenue (TND)',
      value: '48,250',
      change: '+8.7%',
      trend: 'up',
      icon: '💰',
      color: 'from-green-500 to-emerald-600',
    },
    {
      label: 'Active Clubs',
      value: '12',
      change: '+2',
      trend: 'up',
      icon: '🏛️',
      color: 'from-pink-500 to-rose-600',
    },
    {
      label: 'Subscriptions',
      value: '1,256',
      change: '+5.3%',
      trend: 'up',
      icon: '💳',
      color: 'from-primary to-primary-light',
    },
  ];

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

  ticketCategories = [
    { name: 'Film Screenings', count: 1540, pct: 40, color: 'bg-blue-500' },
    { name: 'Watch Parties', count: 962, pct: 25, color: 'bg-green-500' },
    { name: 'Live Events', count: 770, pct: 20, color: 'bg-purple-500' },
    { name: 'Workshops', count: 385, pct: 10, color: 'bg-accent' },
    { name: 'Exhibitions', count: 190, pct: 5, color: 'bg-pink-500' },
  ];

  recentEvents = [
    {
      name: 'Champions League Final',
      type: 'Watch Party',
      date: 'May 31',
      status: 'Upcoming',
      tickets: 156,
      capacity: 200,
      emoji: '⚽',
    },
    {
      name: 'Indie Film Festival',
      type: 'Film Premiere',
      date: 'Jun 5',
      status: 'On Sale',
      tickets: 78,
      capacity: 120,
      emoji: '🎬',
    },
    {
      name: 'Acting Masterclass',
      type: 'Workshop',
      date: 'Jun 12',
      status: 'Open',
      tickets: 18,
      capacity: 30,
      emoji: '🎭',
    },
    {
      name: 'Comedy Night',
      type: 'Live Show',
      date: 'Jun 25',
      status: 'On Sale',
      tickets: 116,
      capacity: 150,
      emoji: '😂',
    },
    {
      name: 'Music Evening',
      type: 'Concert',
      date: 'Jul 3',
      status: 'Planning',
      tickets: 0,
      capacity: 500,
      emoji: '🎵',
    },
  ];

  // Activity feed statique (gardé pour compatibilité)
  activityFeed = [
    { text: 'New user registered: Sami Trabelsi', time: '2 min ago', icon: '👤' },
    { text: 'Ticket purchased for Film Festival (x3)', time: '8 min ago', icon: '🎟️' },
    { text: 'Club "Cinema Club" added new member', time: '15 min ago', icon: '👥' },
    { text: 'Feedback submitted for Comedy Night (⭐)', time: '25 min ago', icon: '💬' },
    { text: 'Material request approved: Projector HD', time: '32 min ago', icon: '✅' },
    { text: 'Subscription renewed: Culture Pass (Ahmed)', time: '45 min ago', icon: '💳' },
    { text: 'New event created: Art Exhibition', time: '1 hour ago', icon: '🎨' },
    { text: 'Loyalty tier upgrade: Bronze → Silver (Fatma)', time: '1 hour ago', icon: '🏆' },
  ];

  topMembers: { name: string; points: number; tier: string; avatar: string; events: number }[] = [];

  subscriptionData: { plan: string; count: number; pct: number; color: string }[] = [
    { plan: 'Silver', count: 0, pct: 0, color: 'bg-gray-400' },
    { plan: 'Gold', count: 0, pct: 0, color: 'bg-accent' },
    { plan: 'VIP', count: 0, pct: 0, color: 'bg-purple-500' },
  ];

  exportLoading = false;
  exportMessage = '';
  exportError = '';

  // ── Live Activity Feed ────────────────────────────────────────────
  liveActivities: LiveActivity[] = [];
  liveUnread = 0;
  showLiveFeed = true;
  activeFilter: FeedFilter = 'all';
  private activitySub?: Subscription;
  private unreadSub?: Subscription;

  // ── Filtres config ────────────────────────────────────────────────
  readonly filters: { key: FeedFilter; label: string; icon: string; class: string; activeClass: string }[] = [
    { key: 'all',      label: 'Tous',         icon: '📋', class: 'border-gray-200 text-gray-600 hover:bg-gray-50',        activeClass: 'bg-gray-800 text-white border-gray-800' },
    { key: 'login',    label: 'Connexions',   icon: '👤', class: 'border-blue-200 text-blue-600 hover:bg-blue-50',        activeClass: 'bg-blue-500 text-white border-blue-500' },
    { key: 'register', label: 'Inscriptions', icon: '🟢', class: 'border-green-200 text-green-600 hover:bg-green-50',     activeClass: 'bg-green-500 text-white border-green-500' },
    { key: 'suspect',  label: 'Suspects',     icon: '🔴', class: 'border-red-200 text-red-600 hover:bg-red-50',           activeClass: 'bg-red-500 text-white border-red-500' },
    { key: 'ban',      label: 'Bans',         icon: '🚫', class: 'border-red-300 text-red-700 hover:bg-red-50',           activeClass: 'bg-red-700 text-white border-red-700' },
    { key: 'loyalty',  label: 'Fidélité',     icon: '🥇', class: 'border-yellow-200 text-yellow-600 hover:bg-yellow-50', activeClass: 'bg-yellow-500 text-white border-yellow-500' },
  ];

  constructor(
    private userService: UserService,
    private carteService: CarteService,
    private auth: AuthService,
    private activityService: AdminActivityService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadClientStats();
    this.loadTopMembers();
    this.initLiveFeed();
  }

  ngOnDestroy() {
    this.activitySub?.unsubscribe();
    this.unreadSub?.unsubscribe();
    // Ne pas déconnecter — le service reste actif entre les navigations
    // this.activityService.disconnect();
  }

  // ── Live Feed ─────────────────────────────────────────────────────
  private initLiveFeed() {
    const token = this.auth.getToken();
    this.activityService.connect(token);

    this.activitySub = this.activityService.activities$.subscribe((activities) => {
      this.liveActivities = activities;
      this.cdr.detectChanges();
    });

    this.unreadSub = this.activityService.unread$.subscribe((count) => {
      this.liveUnread = count;
      this.cdr.detectChanges();
    });

    // Simulation désactivée — uniquement vrais événements WebSocket
    // this.activityService.startSimulation();
  }

  // ── Filtres ───────────────────────────────────────────────────────
  setFilter(filter: FeedFilter): void {
    this.activeFilter = filter;
    this.cdr.detectChanges();
  }

  get filteredActivities(): LiveActivity[] {
    if (this.activeFilter === 'all') return this.liveActivities;
    const map: Record<FeedFilter, string[]> = {
      all:      [],
      login:    ['user_login', 'face_login'],
      register: ['user_register'],
      suspect:  ['suspect_login'],
      ban:      ['user_ban'],
      loyalty:  ['loyalty_upgrade', 'loyalty_points'],
    };
    return this.liveActivities.filter(a => map[this.activeFilter].includes(a.type));
  }

  get filteredCount(): number {
    return this.filteredActivities.length;
  }

  markFeedRead() {
    this.activityService.markAllRead();
  }

  toggleLiveFeed() {
    this.showLiveFeed = !this.showLiveFeed;
    if (!this.showLiveFeed) this.markFeedRead();
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Stats ─────────────────────────────────────────────────────────
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
      error: () => this.cdr.detectChanges(),
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
        this.userService.getAllUsers(0, 50).subscribe({
          next: (page) => {
            this.topMembers = (page.content || [])
              .filter((user) => this.isClientUser(user.roles))
              .slice(0, 5)
              .map((user) => ({
                name: user.nom,
                points: 0,
                tier: 'Silver',
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

  private isClientUser(roles: string[]): boolean {
    return !roles.some((role) => role === 'SUPER_ADMIN' || role.startsWith('ADMIN_'));
  }

  private getAvatar(name: string): string {
    const value = (name || '').trim();
    return value ? value.charAt(0).toUpperCase() : '?';
  }

  private formatTier(level: string): string {
    const n = (level || '').toUpperCase();
    if (n === 'VIP') return 'VIP';
    if (n === 'GOLD') return 'Gold';
    return 'Silver';
  }

  // ── Export ────────────────────────────────────────────────────────
  exportReport() {
    if (this.exportLoading) return;
    this.exportMessage = '';
    this.exportError = '';
    this.exportLoading = true;
    this.cdr.detectChanges();
    forkJoin({
      usersPage: this.userService
        .getAllUsers(0, 200)
        .pipe(
          catchError(() =>
            of({
              content: [] as ExportUser[],
              totalElements: 0,
              totalPages: 0,
              number: 0,
              size: 0,
              first: true,
              last: true,
            }),
          ),
        ),
      overview: this.carteService
        .getAdminOverview()
        .pipe(catchError(() => of({ stats: null, topClients: [] }))),
      topClients: this.carteService.getTop(10).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ usersPage, overview, topClients }) => {
        const allUsers: ExportUser[] = usersPage.content || [];
        const clientUsers = allUsers.filter((user) => this.isClientUser(user.roles || []));
        const summaryRows = [
          { metric: 'Total clients', value: this.getKpiValue('Total Clients') },
          { metric: 'Tickets vendus', value: this.getKpiValue('Tickets Sold') },
          { metric: 'Revenus (TND)', value: this.getKpiValue('Revenue (TND)') },
          { metric: 'Abonnements', value: this.getKpiValue('Subscriptions') },
        ];
        const usersRows = clientUsers.map((user) => ({
          Nom: user.nom,
          Email: user.email,
          Role: user.roles && user.roles.length ? user.roles.join(', ') : 'CLIENT',
          'Date inscription': this.formatDate(user.createdAt),
        }));
        const topRows = (topClients || []).map((client: any) => ({
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
          this.exportExcel(
            summaryRows,
            usersRows,
            topRows,
            loyaltyRows,
            comparisonRows,
            insightRows,
          );
          setTimeout(() => {
            try {
              this.exportPdf(
                summaryRows,
                usersRows,
                topRows,
                loyaltyRows,
                comparisonRows,
                insightRows,
              );
            } catch {
              this.exportError = 'Export PDF échoué.';
            }
            this.exportLoading = false;
            if (!this.exportError) this.exportMessage = 'Rapports exportés: PDF + Excel.';
            this.cdr.detectChanges();
          }, 250);
        } catch {
          this.exportLoading = false;
          this.exportError = 'Export échoué.';
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.exportLoading = false;
        this.exportError = 'Impossible de récupérer les données.';
        this.cdr.detectChanges();
      },
    });
  }

  private exportExcel(
    summaryRows: any[],
    usersRows: any[],
    topRows: any[],
    loyaltyRows: any[],
    comparisonRows: ComparisonRow[],
    insightRows: any[],
  ) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Rapport Admin'],
        [`Généré le ${new Date().toLocaleString('fr-FR')}`],
        [],
        ['Indicateur', 'Valeur'],
        ...summaryRows.map((r) => [r.metric, r.value]),
      ]),
      'Resume',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        usersRows.length
          ? usersRows
          : [{ Nom: '-', Email: '-', Role: '-', 'Date inscription': '-' }],
      ),
      'Users',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        topRows.length ? topRows : [{ Nom: '-', Email: '-', Points: 0, Niveau: '-' }],
      ),
      'Fidelite Top',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(loyaltyRows),
      'Fidelite Stats',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        insightRows.map((r) => ({ Insight: r.insight, Detail: r.detail })),
      ),
      'Insights',
    );
    XLSX.writeFile(workbook, `admin-report-${this.getTimestamp()}.xlsx`);
  }

  private exportPdf(
    summaryRows: any[],
    usersRows: any[],
    topRows: any[],
    loyaltyRows: any[],
    comparisonRows: ComparisonRow[],
    insightRows: any[],
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    doc.setFillColor(122, 29, 43);
    doc.rect(0, 0, 595, 78, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Rapport Admin', 40, 36);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 40, 56);
    doc.setTextColor(30, 30, 30);
    autoTable(doc, {
      startY: 92,
      head: [['Resume', 'Valeur']],
      body: summaryRows.map((r) => [r.metric, String(r.value)]),
      theme: 'striped',
      headStyles: { fillColor: [122, 29, 43] },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Nom', 'Email', 'Role', 'Date']],
      body: usersRows.map((r) => [r.Nom, r.Email, r.Role, r['Date inscription']]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [122, 29, 43] },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Top clients', 'Email', 'Points', 'Niveau']],
      body: topRows.map((r) => [r.Nom, r.Email, String(r.Points), r.Niveau]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 141, 63] },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Fidélité', 'Valeur']],
      body: loyaltyRows.map((r) => [r.metric, String(r.value)]),
      theme: 'striped',
      headStyles: { fillColor: [126, 34, 206] },
    });
    doc.save(`admin-report-${this.getTimestamp()}.pdf`);
  }

  private buildComparisonRows(): ComparisonRow[] {
    return [
      this.buildComparisonRow(
        'Total clients',
        this.getKpiNumericValue('Total Clients'),
        this.kpis[0].change,
      ),
      this.buildComparisonRow(
        'Tickets vendus',
        this.getKpiNumericValue('Tickets Sold'),
        this.kpis[2].change,
      ),
      this.buildComparisonRow(
        'Revenus (TND)',
        this.getKpiNumericValue('Revenue (TND)'),
        this.kpis[3].change,
      ),
      this.buildComparisonRow(
        'Abonnements',
        this.getKpiNumericValue('Subscriptions'),
        this.kpis[5].change,
      ),
    ];
  }

  private buildComparisonRow(metric: string, current: number, changeText: string): ComparisonRow {
    const parsed = this.parseChange(changeText);
    if (!parsed) return { metric, current, previous: current, deltaText: 'n/a', trend: 'flat' };
    if (parsed.type === 'percent') {
      const previous = current / (1 + parsed.value / 100);
      return {
        metric,
        current,
        previous: Math.round(previous),
        deltaText: `${parsed.value > 0 ? '+' : ''}${parsed.value}%`,
        trend: parsed.value > 0 ? 'up' : parsed.value < 0 ? 'down' : 'flat',
      };
    }
    return {
      metric,
      current,
      previous: Math.max(0, current - parsed.value),
      deltaText: `${parsed.value > 0 ? '+' : ''}${parsed.value}`,
      trend: parsed.value > 0 ? 'up' : parsed.value < 0 ? 'down' : 'flat',
    };
  }

  private buildInsightRows(
    comparisonRows: ComparisonRow[],
    loyaltyRows: any[],
    topRows: any[],
  ): Array<{ insight: string; detail: string }> {
    const bestGrowth = [...comparisonRows].sort(
      (a, b) => this.deltaScore(b.deltaText) - this.deltaScore(a.deltaText),
    )[0];
    const vip = loyaltyRows.find((r) => r.metric === 'Clients VIP')?.value || 0;
    const gold = loyaltyRows.find((r) => r.metric === 'Clients Gold')?.value || 0;
    const silver = loyaltyRows.find((r) => r.metric === 'Clients Silver')?.value || 0;
    const totalTiered = vip + gold + silver;
    const premiumShare = totalTiered ? Math.round(((vip + gold) / totalTiered) * 100) : 0;
    const avgTopPoints = topRows.length
      ? Math.round(
        topRows.reduce((sum: number, r: any) => sum + r.Points, 0) / topRows.length,
      )
      : 0;
    return [
      {
        insight: 'Croissance dominante',
        detail: bestGrowth ? `${bestGrowth.metric}: ${bestGrowth.deltaText}` : 'Aucune tendance.',
      },
      { insight: 'Mix fidélité premium', detail: `Gold + VIP = ${premiumShare}% de la base.` },
      { insight: 'Engagement top clients', detail: `Moyenne ${avgTopPoints} points.` },
      { insight: 'Action recommandée', detail: 'Campagne Silver -> Gold sur 7 jours.' },
    ];
  }

  private deltaScore(deltaText: string): number {
    const numeric = Number(deltaText.replace('%', '').replace(',', '.').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private parseChange(
    changeText?: string,
  ): { type: 'percent' | 'absolute'; value: number } | null {
    if (!changeText) return null;
    const text = changeText.trim().toLowerCase();
    if (text === 'live' || text === 'n/a' || text === '-') return null;
    const normalized = text.replace(',', '.');
    const isPercent = normalized.includes('%');
    const numeric = Number(normalized.replace(/[^0-9+\-.]/g, ''));
    if (!Number.isFinite(numeric)) return null;
    return { type: isPercent ? 'percent' : 'absolute', value: numeric };
  }

  private getKpiNumericValue(label: string): number {
    return this.parseNumber(this.getKpiValue(label));
  }

  private parseNumber(value: string): number {
    const numeric = Number(
      (value || '')
        .replace(/\s/g, '')
        .replace(/,/g, '')
        .replace(/[^0-9.-]/g, ''),
    );
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private getKpiValue(label: string): string {
    return this.kpis.find((k) => k.label === label)?.value || '0';
  }

  private formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Upcoming':
        return 'bg-blue-50 text-blue-600';
      case 'On Sale':
        return 'bg-green-50 text-green-600';
      case 'Open':
        return 'bg-purple-50 text-purple-600';
      case 'Planning':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  }

  getTierColor(tier: string): string {
    switch (tier) {
      case 'VIP':
        return 'text-purple-500';
      case 'Gold':
        return 'text-accent';
      case 'Silver':
        return 'text-gray-400';
      default:
        return 'text-orange-600';
    }
  }
}
