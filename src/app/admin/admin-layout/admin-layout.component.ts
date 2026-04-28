import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { Observable } from 'rxjs';
import { GuestPreviewService } from '../../core/services/guest-preview.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

interface AdminMenuItem {
  label: string;
  icon: string;
  route: string;
  permissions?: string[];
  roles?: string[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  activeSection = '';
  toast$!: Observable<any>;
  profileDropdownOpen = false;
  clientModeLoading = false;

  adminName = 'Admin';
  adminEmail = '';
  adminRoleLabel = 'Admin';
  adminAvatarUrl = '';
  adminId: number | null = null;

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private guestPreview: GuestPreviewService,
    private impersonation: ImpersonationService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.adminName = this.auth.getCurrentUserName() || 'Admin';
    this.adminEmail = this.auth.getCurrentUserEmail() || '';
    this.adminId = this.auth.getCurrentUserId();
    this.adminRoleLabel = this.getAdminRoleLabel();
  }

  get adminInitials(): string {
    const parts = (this.adminName || '').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] || 'A').toUpperCase();
  }

  private readonly allMenuItems: AdminMenuItem[] = [
    {
      label: 'Dashboard',
      icon: '📊',
      route: '/admin/dashboard',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'],
    },
    {
      label: 'Intelligence AI',
      icon: '🤖',
      route: '/admin/ml',
      permissions: ['ADMIN_MANAGE'],
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'Events',
      icon: '🎭',
      route: '/admin/events',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'],
    },
    {
      label: 'Films',
      icon: '🎬',
      route: '/admin/films',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'],
    },
    // ── Ajout Cinémas ─────────────────────────────────────────────
    {
      label: 'Cinémas',
      icon: '🏛️',
      route: '/admin/cinemas',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'],
    },
    {
      label: 'Tickets',
      icon: '🎟️',
      route: '/admin/tickets',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'],
    },
    {
      label: 'Club',
      icon: '👥',
      route: '/admin/club',
      roles: ['SUPER_ADMIN', 'ADMIN_CLUB'],
    },
    {
      label: 'Chat',
      icon: '💬',
      route: '/admin/chat',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'],
    },
    {
      label: 'Subscriptions',
      icon: '💳',
      route: '/admin/subscriptions',
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'Users',
      icon: '👤',
      route: '/admin/users',
      permissions: ['ADMIN_MANAGE'],
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'Loyalty',
      icon: '⭐',
      route: '/admin/loyalty',
      permissions: ['FIDELITY_UPDATE', 'ADMIN_MANAGE'],
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'Roles',
      icon: '🛡️',
      route: '/admin/roles',
      permissions: ['ADMIN_MANAGE'],
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'Logistics',
      icon: '📦',
      route: '/admin/logistics',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'],
    },
    {
      label: 'Feedback',
      icon: '💬',
      route: '/admin/feedback',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'],
    },
    {
      label: 'Notifications',
      icon: '🔔',
      route: '/admin/notifications',
      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'],
    },
  ];

  get menuItems(): AdminMenuItem[] {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) {
      return this.allMenuItems;
    }
    return this.allMenuItems.filter((item) => {
      const roleOk = !item.roles || item.roles.some((r) => roles.includes(r));
      const permOk = !item.permissions || this.auth.hasAnyPermission(item.permissions);
      return roleOk && permOk;
    });
  }

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (u: any) => {
        this.adminName = u.nom || u.name || u.fullName || this.adminName;
        this.adminEmail = u.email || this.adminEmail;
        this.adminId = u.id || this.adminId;
        this.adminRoleLabel = this.getAdminRoleLabel();
        this.adminAvatarUrl = this.resolveUrl(u.avatarUrl);
        this.cdr.markForCheck();
      },
    });
  }

  startClientMode() {
    if (!this.adminId) {
      this.toastService.error('Impossible de récupérer votre identifiant.');
      return;
    }
    this.clientModeLoading = true;
    this.closeProfileDropdown();
    this.impersonation
      .startImpersonation({
        targetUserId: this.adminId,
        targetUserName: this.adminName,
        targetUserEmail: this.adminEmail,
      })
      .subscribe({
        next: () => {
          this.clientModeLoading = false;
          this.toastService.success('Mode client activé — vous naviguez comme un client. 🎭');
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.clientModeLoading = false;
          const msg = err?.error?.message || err?.error || '';
          if (msg.includes('CLIENT') || msg.includes('role')) {
            this.toastService.info("Redirection vers l'interface client...");
            this.router.navigate(['/home']);
          } else {
            this.toastService.error("Impossible d'activer le mode client : " + (msg || 'Erreur serveur'));
          }
        },
      });
  }

  openGuestPreview() {
    this.guestPreview.openGuestPreview('/home');
    this.closeProfileDropdown();
  }

  toggleProfileDropdown() { this.profileDropdownOpen = !this.profileDropdownOpen; }
  closeProfileDropdown()  { this.profileDropdownOpen = false; }
  toggleSidebar()         { this.sidebarCollapsed = !this.sidebarCollapsed; }
  logout()                { this.closeProfileDropdown(); this.auth.logout(); }

  private resolveUrl(raw: unknown): string {
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (!v) return '';
    if (v.startsWith('http')) return v;
    return `${environment.apiUrl.replace(/\/$/, '')}${v.startsWith('/') ? v : '/' + v}`;
  }



  private getAdminRoleLabel(): string {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN'))  return 'Super Admin';
    if (roles.includes('ADMIN_CINEMA')) return 'Admin Cinéma';
    if (roles.includes('ADMIN_EVENT'))  return 'Admin Events';
    if (roles.includes('ADMIN_CLUB'))   return 'Admin Club';
    return 'Admin';
  }
}
