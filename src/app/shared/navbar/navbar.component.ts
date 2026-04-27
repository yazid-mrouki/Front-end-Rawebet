import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.Default  // Changed from OnPush to Default
})
export class NavbarComponent implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  managementDropdown = false;
  profileDropdown = false;
  userName = '';
  unreadCount = 0;
  userId: number | null = null;

  private auth = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  notificationService = inject(NotificationService);
  private cd = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Subscribe to unread count from service
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
        this.cd.detectChanges();  // Force change detection
      });

    // Load immediately if already authenticated
    if (this.auth.isAuthenticated()) {
      this.loadUserData();
    }

    // React to future login/logout events
    this.auth.authState
      .pipe(takeUntil(this.destroy$))
      .subscribe(authenticated => {
        if (authenticated) {
          this.loadUserData();
        } else {
          this.userName = '';
          this.unreadCount = 0;
          this.userId = null;
          this.notificationService.resetUnreadCount();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData() {
    this.userService.getMe().subscribe({
      next: (u) => {
        const anyU = u as any;
        this.userName = anyU.nom || anyU.fullName || anyU.name || anyU.username || 'U';
        this.userId = anyU.id;

        if (this.userId) {
          this.loadUnreadCount(this.userId);
        }
      },
      error: (err) => {
        this.userName = 'U';
      }
    });
  }

  private loadUnreadCount(userId: number) {
    this.notificationService.getUnreadCount(userId).subscribe({
      next: (data: any) => {
        const count = data.count !== undefined ? data.count :
                     data.unreadCount !== undefined ? data.unreadCount :
                     data.totalCount || 0;

        this.notificationService.setUnreadCount(count);
      },
      error: (err) => {
        this.notificationService.setUnreadCount(0);
      }
    });
  }

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

  isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  isAdmin() {
    return this.auth.isAdmin();
  }

  logout() {
    this.closeDropdowns();
    this.auth.logout();
  }

  navigateToSubscriptions(event?: Event, closeMobile = false) {
    event?.preventDefault();

    this.router.navigateByUrl('/subscriptions').then(() => {
      this.closeDropdowns();
      if (closeMobile) {
        this.mobileMenuOpen = false;
      }
    });
  }
}
