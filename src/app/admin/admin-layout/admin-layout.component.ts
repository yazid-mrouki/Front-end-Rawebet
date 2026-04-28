import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

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
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {

  sidebarCollapsed = false;
  adminName = 'Super Admin';
  adminEmail = '';
  adminRoleLabel = 'Super Admin';

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.adminName = this.auth.getCurrentUserName() || 'Super Admin';
    this.adminEmail = this.auth.getCurrentUserEmail();
    this.adminRoleLabel = this.getAdminRoleLabel();
  }

  private readonly allMenuItems: AdminMenuItem[] = [
    { label: 'Dashboard',     icon: '📊', route: '/admin/dashboard',      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'] },
    { label: 'Events',        icon: '🎭', route: '/admin/events',         roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'] },
    { label: 'Event Spaces',  icon: '🏢', route: '/admin/event-spaces',   roles: ['SUPER_ADMIN', 'ADMIN_EVENT'] },
    { label: 'Films',         icon: '🎬', route: '/admin/films',          roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Cinémas',       icon: '🏛️', route: '/admin/cinemas',        roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Tickets',       icon: '🎟️', route: '/admin/tickets',        roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'] },
    { label: 'Club',          icon: '👥', route: '/admin/club',           roles: ['SUPER_ADMIN', 'ADMIN_CLUB'] },
    { label: 'Chat',          icon: '💬', route: '/admin/chat',           roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Subscriptions', icon: '💳', route: '/admin/subscriptions',  roles: ['SUPER_ADMIN'] },
    { label: 'Materials',     icon: '🔧', route: '/admin/materiels',      roles: ['SUPER_ADMIN', 'ADMIN_EVENT'] },
    { label: 'Reservations',  icon: '📅', route: '/admin/reservations',   roles: ['SUPER_ADMIN', 'ADMIN_EVENT'] },
    { label: 'Users',         icon: '👤', route: '/admin/users',          permissions: ['ADMIN_MANAGE'], roles: ['SUPER_ADMIN'] },
    { label: 'Loyalty',       icon: '⭐', route: '/admin/loyalty',        permissions: ['FIDELITY_UPDATE'], roles: ['SUPER_ADMIN'] },
    { label: 'Role',          icon: '🛡️', route: '/admin/roles',          permissions: ['ADMIN_MANAGE'], roles: ['SUPER_ADMIN'] },
    { label: 'Logistics',     icon: '📦', route: '/admin/logistics',      roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Feedback',      icon: '💬', route: '/admin/feedback',       roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'] },
    { label: 'Notifications', icon: '🔔', route: '/admin/notifications',  roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_CLUB'] },
  ];

  get menuItems(): AdminMenuItem[] {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) {
      return this.allMenuItems.filter(item => !item.permissions || this.auth.hasAnyPermission(item.permissions));
    }
    return this.allMenuItems.filter(item => {
      const roleAllowed = !item.roles || item.roles.some(role => roles.includes(role));
      const permissionAllowed = !item.permissions || this.auth.hasAnyPermission(item.permissions);
      return roleAllowed && permissionAllowed;
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.userService.getMe().subscribe({
        next: (u: any) => {
          this.adminName = u.nom || u.fullName || u.name || u.username || this.adminName;
          this.adminEmail = u.email || this.adminEmail;
          this.adminRoleLabel = this.getAdminRoleLabel();
          this.cdr.detectChanges();
        }
      });
    }, 0);
  }

  private getAdminRoleLabel(): string {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) return 'Super Admin';
    if (roles.includes('ADMIN_CINEMA')) return 'Admin Cinéma';
    if (roles.includes('ADMIN_EVENT')) return 'Admin Event';
    if (roles.includes('ADMIN_CLUB')) return 'Admin Club';
    return 'Admin';
  }

  toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  logout() { this.auth.logout(); }
}
