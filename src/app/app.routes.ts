import { Routes } from '@angular/router';
import { SignInComponent } from './pages/auth/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth/sign-up/sign-up.component';
import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';
import { FilmsComponent } from './pages/films/films.component';
import { CinemasComponent } from './pages/cinemas/cinemas.component';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { ClubsComponent } from './pages/clubs/clubs.component';
import { SubscriptionsComponent } from './pages/subscriptions/subscriptions.component';
import { LoyaltyComponent } from './pages/loyalty/loyalty.component';
import { LogisticsComponent } from './pages/logistics/logistics.component';
import { FeedbackComponent } from './pages/feedback/feedback.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { authGuard } from './core/guards/auth.guard';

import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/dashboard/admin-dashboard.component';
import { AdminEventsComponent } from './admin/pages/events/admin-events.component';
import { AdminFilmsComponent } from './admin/pages/films/admin-films.component';
import { AdminCinemasComponent } from './admin/pages/cinemas/admin-cinemas.component';
import { AdminTicketsComponent } from './admin/pages/tickets/admin-tickets.component';
import { AdminClubComponent } from './admin/pages/club/admin-club.component';
import { AdminClubEventDetailComponent } from './admin/pages/club-event-detail/admin-club-event-detail.component';
import { AdminSubscriptionsComponent } from './admin/pages/subscriptions/admin-subscriptions.component';
import { AdminUsersComponent } from './admin/pages/users/admin-users.component';
import { AdminLoyaltyComponent } from './admin/pages/loyalty/admin-loyalty.component';
import { AdminRolesComponent } from './admin/pages/roles/admin-roles.component';
import { AdminLogisticsComponent } from './admin/pages/logistics/admin-logistics.component';
import { AdminFeedbackComponent } from './admin/pages/feedback/admin-feedback.component';
import { AdminNotificationsComponent } from './admin/pages/notifications/admin-notifications.component';
import { AdminChatComponent } from './admin/pages/chat/admin-chat.component';
import { adminGuard } from './core/guards/admin.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  { path: 'auth/sign-in', component: SignInComponent },
  { path: 'auth/sign-up', component: SignUpComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  { path: 'auth/reset-password', component: ResetPasswordComponent },

  { path: 'home', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'films', component: FilmsComponent },
  { path: 'cinemas', component: CinemasComponent },
  { path: 'tickets', component: TicketsComponent, canActivate: [authGuard] },
  { path: 'clubs', component: ClubsComponent },
  { path: 'subscriptions', component: SubscriptionsComponent },
  { path: 'loyalty', component: LoyaltyComponent, canActivate: [authGuard] },
  { path: 'logistics', component: LogisticsComponent },
  { path: 'feedback', component: FeedbackComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent },

  // === CLUB FEATURE ===
  {
    path: 'club',
    loadChildren: () => import('./features/club/club.routes').then((m) => m.CLUB_ROUTES),
  },

  // === CHAT FEATURE ===
  {
    path: 'chat',
    loadChildren: () => import('./features/chat/chat.routes').then((m) => m.CHAT_ROUTES),
  },

  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'events', component: AdminEventsComponent },
      { path: 'films', component: AdminFilmsComponent },
      { path: 'cinemas', component: AdminCinemasComponent },
      { path: 'tickets', component: AdminTicketsComponent },
      { path: 'club', component: AdminClubComponent },
      { path: 'club/events/:id', component: AdminClubEventDetailComponent },
      { path: 'subscriptions', component: AdminSubscriptionsComponent },
      {
        path: 'users',
        component: AdminUsersComponent,
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },
      {
        path: 'loyalty',
        component: AdminLoyaltyComponent,
        canActivate: [permissionGuard(['FIDELITY_UPDATE'])],
      },

      {
        path: 'roles',
        component: AdminRolesComponent,
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },
      { path: 'logistics', component: AdminLogisticsComponent },
      { path: 'feedback', component: AdminFeedbackComponent },
      { path: 'notifications', component: AdminNotificationsComponent },
      { path: 'chat', component: AdminChatComponent },
    ],
  },

  { path: '**', redirectTo: 'home' },
];