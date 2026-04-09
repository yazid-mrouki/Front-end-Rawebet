import { Component, OnInit } from '@angular/core';
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
  activeSection = '';

  adminName = 'Super Admin';
  adminEmail = '';
  adminRoleLabel = 'Super Admin';

  constructor(private userService: UserService, private auth: AuthService) {
    this.adminName = this.auth.getCurrentUserName() || 'Super Admin';
    this.adminEmail = this.auth.getCurrentUserEmail();
    this.adminRoleLabel = this.getAdminRoleLabel();
  }

  private readonly allMenuItems: AdminMenuItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_FORMATION'] },
    { label: 'Events', icon: '🎭', route: '/admin/events', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'] },
    { label: 'Films', icon: '🎬', route: '/admin/films', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Tickets', icon: '🎟️', route: '/admin/tickets', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'] },
    { label: 'Clubs', icon: '👥', route: '/admin/clubs', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Subscriptions', icon: '💳', route: '/admin/subscriptions', roles: ['SUPER_ADMIN'] },
    { label: 'Users', icon: '👤', route: '/admin/users', permissions: ['ADMIN_MANAGE'], roles: ['SUPER_ADMIN'] },
    { label: 'Loyalty', icon: '⭐', route: '/admin/loyalty', permissions: ['FIDELITY_UPDATE'], roles: ['SUPER_ADMIN'] },
    { label: 'Logistics', icon: '📦', route: '/admin/logistics', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA'] },
    { label: 'Feedback', icon: '💬', route: '/admin/feedback', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'] },
    { label: 'Notifications', icon: '🔔', route: '/admin/notifications', roles: ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT', 'ADMIN_FORMATION'] },
  ];

  get menuItems(): AdminMenuItem[] {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) {
      return this.allMenuItems.filter((item) => !item.permissions || this.auth.hasAnyPermission(item.permissions));
    }

    return this.allMenuItems.filter((item) => {
      const roleAllowed = !item.roles || item.roles.some((role) => roles.includes(role));
      const permissionAllowed = !item.permissions || this.auth.hasAnyPermission(item.permissions);
      return roleAllowed && permissionAllowed;
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.userService.getMe().subscribe({
        next: (u) => {
          this.adminName = u.nom || this.adminName;
          this.adminEmail = u.email || this.adminEmail;
          this.adminRoleLabel = this.getAdminRoleLabel();
        }
      });
    }, 0);
  }

  private getAdminRoleLabel(): string {
    const roles = this.auth.getRoles();
    if (roles.includes('SUPER_ADMIN')) return 'Super Admin';
    if (roles.includes('ADMIN_CINEMA')) return 'Admin Cinéma';
    if (roles.includes('ADMIN_EVENT')) return 'Admin Event';
    if (roles.includes('ADMIN_FORMATION')) return 'Admin Formation';
    return 'Admin';
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    this.auth.logout();
  }
}
