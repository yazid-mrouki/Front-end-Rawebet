import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { ToastComponent } from './shared/toast/toast.component';
import { GuestPreviewService } from './core/services/guest-preview.service';
import { ImpersonationService, ImpersonationInfo } from './core/services/impersonation.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  showLayout = true;
  isGuestMode = false;
  isImpersonating = false;
  impersonationInfo: ImpersonationInfo | null = null;

  constructor(
    private router: Router,
    private guestPreview: GuestPreviewService,
    private impersonation: ImpersonationService,
  ) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.showLayout = !e.url.startsWith('/auth') && !e.url.startsWith('/admin');
        // Rafraîchir à chaque navigation (le token peut expirer)
        this.isImpersonating = this.impersonation.isImpersonating();
        this.impersonationInfo = this.impersonation.getImpersonationInfo();
      });
  }

  ngOnInit() {
    this.isGuestMode = this.guestPreview.initFromUrl() || this.guestPreview.isGuestPreview();
    this.isImpersonating = this.impersonation.isImpersonating();
    this.impersonationInfo = this.impersonation.getImpersonationInfo();
  }

  exitGuestMode() {
    this.guestPreview.exitGuestPreview();
  }
  exitClientMode() {
    this.impersonation.exitImpersonation();
    this.isImpersonating = false;
    this.impersonationInfo = null;
  }
}
