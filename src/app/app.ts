import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  showLayout = true;
  showFooter = true;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      const hiddenRoutes = ['/auth', '/admin'];
      const footerRoutes = ['/auth', '/admin', '/chat'];
      this.showLayout = !hiddenRoutes.some(r => event.url.startsWith(r));
      this.showFooter = !footerRoutes.some(r => event.url.startsWith(r));
    });
  }
}