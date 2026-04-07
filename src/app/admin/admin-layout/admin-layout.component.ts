import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  sidebarCollapsed = false;
  activeSection = '';

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

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
