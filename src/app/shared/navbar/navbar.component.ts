import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.loadUser();
    }
    this.auth.authState.subscribe(authenticated => {
      if (authenticated) {
        this.loadUser();
      } else {
        this.userName = '';
        this.cdr.detectChanges();
      }
    });
  }

  private loadUser(): void {
    this.userService.getMe().subscribe({
      next: (u: any) => {
        this.userName = u.nom || u.fullName || u.name || u.username || '';
        this.cdr.detectChanges();
      }
    });
  }

  isBackOfficeAdmin(): boolean {
    const roles = this.auth.getRoles();
    return roles.some(r => ['SUPER_ADMIN', 'ADMIN_CINEMA', 'ADMIN_EVENT'].includes(r));
  }

  isAuthenticated() { return this.auth.isAuthenticated(); }
  isAdmin() { return this.auth.isAdmin(); }
  toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
  toggleManagement() { this.managementDropdown = !this.managementDropdown; this.profileDropdown = false; }
  toggleProfile() { this.profileDropdown = !this.profileDropdown; this.managementDropdown = false; }
  closeDropdowns() { this.managementDropdown = false; this.profileDropdown = false; }
  logout() { this.closeDropdowns(); this.auth.logout(); }
}