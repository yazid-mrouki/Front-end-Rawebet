import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  mobileMenuOpen = false;
  managementDropdown = false;
  profileDropdown = false;

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleManagement() {
    this.managementDropdown = !this.managementDropdown;
    this.profileDropdown = false;
  }

  toggleProfile() {
    this.profileDropdown = !this.profileDropdown;
    this.managementDropdown = false;
  }

  closeDropdowns() {
    this.managementDropdown = false;
    this.profileDropdown = false;
  }
}
