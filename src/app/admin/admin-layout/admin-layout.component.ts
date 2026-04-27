import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast';
import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';


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
  adminName = '';
  adminEmail = '';

constructor(
  private userService: UserService,
  private auth: AuthService,
  private cdr: ChangeDetectorRef,
  private toastService: ToastService
) {}

  menuItems = [
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard' },
    { label: 'Events', icon: '🎭', route: '/admin/events' },
    { label: 'Films', icon: '🎬', route: '/admin/films' },
    { label: 'Tickets', icon: '🎟️', route: '/admin/tickets' },
    { label: 'Clubs', icon: '👥', route: '/admin/clubs' },
    { label: 'Subscriptions', icon: '💳', route: '/admin/subscriptions' },
    { label: 'Users', icon: '👤', route: '/admin/users' },
    { label: 'Loyalty', icon: '⭐', route: '/admin/loyalty' },
    { label: 'Logistics', icon: '📦', route: '/admin/logistics' },
    { label: 'Feedback', icon: '💬', route: '/admin/feedback' },
    { label: 'Notifications', icon: '🔔', route: '/admin/notifications' },
  ];

ngOnInit() {
  this.toast$ = this.toastService.toast$;

  this.userService.getMe().subscribe({
    next: (u) => {
      this.adminName = u.nom || u.username || u.email || '';
      this.adminEmail = u.email;
      this.cdr.markForCheck();
    },
    error: (error) => {
      this.adminName = '';
      this.adminEmail = '';
      this.cdr.markForCheck();
    }
  });
}
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() { this.auth.logout(); }
}
