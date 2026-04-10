import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {

  mobileMenuOpen = false;
  managementDropdown = false;
  profileDropdown = false;
  userName = '';

  private auth = inject(AuthService);
  private userService = inject(UserService);

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.loadUserName();
    }
    this.auth.authState.subscribe(authenticated => {
      if (authenticated) this.loadUserName();
      else this.userName = '';
    });
  }

  private loadUserName() {
    this.userService.getMe().subscribe({
      next: (u: any) => {
        this.userName = u.nom || u.fullName || u.name || u.username || '';
      }
    });
  }

  // Seuls SUPER_ADMIN, ADMIN_CINEMA, ADMIN_EVENT voient le menu Management (back-office)
  // ADMIN_CLUB gère depuis le front-office (/club/admin)
  isBackOfficeAdmin(): boolean {
    const roles = this.auth.getRoles();
    return roles.some(r => ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'].includes(r));
  }

  isAuthenticated() { return this.auth.isAuthenticated(); }

  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  toggleManagement() { this.managementDropdown = !this.managementDropdown; this.profileDropdown = false; }
  toggleProfile() { this.profileDropdown = !this.profileDropdown; this.managementDropdown = false; }
  closeDropdowns() { this.managementDropdown = false; this.profileDropdown = false; }

  logout() { this.closeDropdowns(); this.auth.logout(); }
}