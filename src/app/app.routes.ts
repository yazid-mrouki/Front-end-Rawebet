import { Routes } from '@angular/router';
import { SignInComponent } from './pages/auth/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth/sign-up/sign-up.component';
import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';
import { FilmsComponent } from './pages/films/films.component';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { ClubsComponent } from './pages/clubs/clubs.component';
import { SubscriptionsComponent } from './pages/subscriptions/subscriptions.component';
import { LoyaltyComponent } from './pages/loyalty/loyalty.component';
import { LogisticsComponent } from './pages/logistics/logistics.component';
import { FeedbackComponent } from './pages/feedback/feedback.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';

// Admin
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/dashboard/admin-dashboard.component';
import { AdminEventsComponent } from './admin/pages/events/admin-events.component';
import { AdminFilmsComponent } from './admin/pages/films/admin-films.component';
import { AdminTicketsComponent } from './admin/pages/tickets/admin-tickets.component';
import { AdminClubsComponent } from './admin/pages/clubs/admin-clubs.component';
import { AdminSubscriptionsComponent } from './admin/pages/subscriptions/admin-subscriptions.component';
import { AdminUsersComponent } from './admin/pages/users/admin-users.component';
import { AdminLoyaltyComponent } from './admin/pages/loyalty/admin-loyalty.component';
import { AdminLogisticsComponent } from './admin/pages/logistics/admin-logistics.component';
import { AdminFeedbackComponent } from './admin/pages/feedback/admin-feedback.component';
import { AdminNotificationsComponent } from './admin/pages/notifications/admin-notifications.component';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'auth/sign-in', component: SignInComponent },
  { path: 'auth/sign-up', component: SignUpComponent },
  { path: 'home', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'films', component: FilmsComponent },
  { path: 'tickets', component: TicketsComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'subscriptions', component: SubscriptionsComponent },
  { path: 'loyalty', component: LoyaltyComponent },
  { path: 'logistics', component: LogisticsComponent },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'notifications', component: NotificationsComponent },

  // ─── Admin Panel ───
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'events', component: AdminEventsComponent },
      { path: 'films', component: AdminFilmsComponent },
      { path: 'tickets', component: AdminTicketsComponent },
      { path: 'clubs', component: AdminClubsComponent },
      { path: 'subscriptions', component: AdminSubscriptionsComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'loyalty', component: AdminLoyaltyComponent },
      { path: 'logistics', component: AdminLogisticsComponent },
      { path: 'feedback', component: AdminFeedbackComponent },
      { path: 'notifications', component: AdminNotificationsComponent },
    ]
  },

  { path: '**', redirectTo: 'home' }
];
