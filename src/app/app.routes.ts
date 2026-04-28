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
import { TicketVerifyComponent } from './pages/ticket-verify/ticket-verify.component';
// ✅ AJOUT : import manquant qui causait l'erreur TS
import { MarkReservationUsedComponent } from './pages/mark-reservation-used/mark-reservation-used';
import { authGuard } from './core/guards/auth.guard';

import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin/pages/dashboard/admin-dashboard.component';
import { AdminEventsComponent } from './admin/pages/events/admin-events.component';
import { AdminFilmsComponent } from './admin/pages/films/admin-films.component';
import { AdminCinemasComponent } from './admin/pages/cinemas/admin-cinemas.component';
import { AdminTicketsComponent } from './admin/pages/tickets/admin-tickets.component';
import { AdminSeancesComponent } from './admin/pages/seances/admin-seances.component';
import { AdminClubComponent } from './admin/pages/club/admin-club.component';
import { AdminSubscriptionsComponent } from './admin/pages/subscriptions/admin-subscriptions.component';
import { AdminUsersComponent } from './admin/pages/users/admin-users.component';
import { AdminLoyaltyComponent } from './admin/pages/loyalty/admin-loyalty.component';
import { AdminLogisticsComponent } from './admin/pages/logistics/admin-logistics.component';
import { AdminFeedbackComponent } from './admin/pages/feedback/admin-feedback.component';
import { AdminNotificationsComponent } from './admin/pages/notifications/admin-notifications.component';
import { AdminChatComponent } from './admin/pages/chat/admin-chat.component';
import { adminGuard } from './core/guards/admin.guard';
import { permissionGuard } from './core/guards/permission.guard';

// Permissions réelles définies dans DataInitializer.java :
// SUPER_ADMIN  → toutes les permissions
// ADMIN_CINEMA → CINEMA_CREATE, CINEMA_READ, CINEMA_UPDATE, CINEMA_DELETE
// ADMIN_EVENT  → EVENT_CREATE, EVENT_READ, EVENT_UPDATE, EVENT_DELETE
// ADMIN_CLUB   → CLUB_CREATE, CLUB_READ, CLUB_UPDATE, CLUB_DELETE, CLUB_MANAGE
// CLIENT       → FIDELITY_READ, FIDELITY_UPDATE

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // ── Auth (public) ────────────────────────────────────────────────
  {
    path: 'auth/sign-in',
    loadComponent: () =>
      import('./pages/auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
  },
  {
    path: 'auth/sign-up',
    loadComponent: () =>
      import('./pages/auth/sign-up/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  { path: 'home', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'films', component: FilmsComponent },
  { path: 'cinemas', component: CinemasComponent },
  { path: 'tickets', component: TicketsComponent, canActivate: [authGuard] },
  { path: 'ticket/verify/:id', component: TicketVerifyComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'subscriptions', component: SubscriptionsComponent },
  { path: 'loyalty', component: LoyaltyComponent, canActivate: [authGuard] },
  { path: 'logistics', component: LogisticsComponent },
  { path: 'feedback', component: FeedbackComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent },

  // ── Pages client (connecté requis) ───────────────────────────────
  {
    path: 'tickets',
    loadComponent: () =>
      import('./pages/tickets/tickets.component').then((m) => m.TicketsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'loyalty',
    loadComponent: () =>
      import('./pages/loyalty/loyalty.component').then((m) => m.LoyaltyComponent),
    canActivate: [authGuard],
  },
  {
    path: 'feedback',
    loadComponent: () =>
      import('./pages/feedback/feedback.component').then((m) => m.FeedbackComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
    canActivate: [authGuard],
  },

  // ── Features (lazy) ──────────────────────────────────────────────
  {
    path: 'club',
    loadChildren: () => import('./features/club/club.routes').then((m) => m.CLUB_ROUTES),
  },
  {
    path: 'chat',
    loadChildren: () => import('./features/chat/chat.routes').then((m) => m.CHAT_ROUTES),
  },
  {
    path: 'reservations/mark-used/:id',
    component: MarkReservationUsedComponent,
  },

  // ════════════════════════════════════════════════════════════════
  // ESPACE ADMIN
  // ════════════════════════════════════════════════════════════════
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'events', component: AdminEventsComponent },
      { path: 'films', component: AdminFilmsComponent },
      { path: 'cinemas', component: AdminCinemasComponent },
      { path: 'seances', component: AdminSeancesComponent },
      { path: 'tickets', component: AdminTicketsComponent },
      { path: 'club', component: AdminClubComponent },
      { path: 'subscriptions', component: AdminSubscriptionsComponent },
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./admin/pages/unauthorized/admin-unauthorized.component').then(
            (m) => m.AdminUnauthorizedComponent,
          ),
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/pages/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },

      {
        path: 'events',
        loadComponent: () =>
          import('./admin/pages/events/admin-events.component').then(
            (m) => m.AdminEventsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'films',
        loadComponent: () =>
          import('./admin/pages/films/admin-films.component').then((m) => m.AdminFilmsComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'cinemas',
        loadComponent: () =>
          import('./admin/pages/cinemas/admin-cinemas.component').then(
            (m) => m.AdminCinemasComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'tickets',
        loadComponent: () =>
          import('./admin/pages/tickets/admin-tickets.component').then(
            (m) => m.AdminTicketsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'club',
        loadComponent: () =>
          import('./admin/pages/club/admin-club.component').then((m) => m.AdminClubComponent),
        canActivate: [permissionGuard(['CLUB_MANAGE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'club/events/:id',
        loadComponent: () =>
          import('./admin/pages/club-event-detail/admin-club-event-detail.component').then(
            (m) => m.AdminClubEventDetailComponent,
          ),
        canActivate: [permissionGuard(['CLUB_MANAGE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'chat',
        loadComponent: () =>
          import('./admin/pages/chat/admin-chat.component').then((m) => m.AdminChatComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'chat/:id',
        loadComponent: () =>
          import('./admin/pages/chat/admin-chat-detail.component').then(
            (m) => m.AdminChatDetailComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./admin/pages/subscriptions/admin-subscriptions.component').then(
            (m) => m.AdminSubscriptionsComponent,
          ),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      {
        path: 'materiels',
        loadComponent: () =>
          import('./admin/pages/materiels/admin-materiels-unified.component').then(
            (m) => m.AdminMaterielsUnifiedComponent,
          ),
        canActivate: [permissionGuard(['EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'reservations',
        loadComponent: () =>
          import('./admin/pages/reservations/admin-reservations.component').then(
            (m) => m.AdminReservationsComponent,
          ),
        canActivate: [permissionGuard(['EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'users',
        loadComponent: () =>
          import('./admin/pages/users/admin-users.component').then((m) => m.AdminUsersComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      {
        path: 'loyalty',
        loadComponent: () =>
          import('./admin/pages/loyalty/admin-loyalty.component').then(
            (m) => m.AdminLoyaltyComponent,
          ),
        canActivate: [permissionGuard(['FIDELITY_UPDATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'roles',
        loadComponent: () =>
          import('./admin/pages/roles/admin-roles.component').then((m) => m.AdminRolesComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      {
        path: 'logistics',
        loadComponent: () =>
          import('./admin/pages/logistics/admin-logistics.component').then(
            (m) => m.AdminLogisticsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'feedback',
        loadComponent: () =>
          import('./admin/pages/feedback/admin-feedback.component').then(
            (m) => m.AdminFeedbackComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      {
        path: 'ml',
        loadComponent: () =>
          import('./admin/pages/ml/admin-ml.component').then((m) => m.AdminMlComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      {
        path: 'notifications',
        loadComponent: () =>
          import('./admin/pages/notifications/admin-notifications.component').then(
            (m) => m.AdminNotificationsComponent,
          ),
      },
    ],
  },

  // ── Wildcard ─────────────────────────────────────────────────────
  { path: '**', redirectTo: 'home' },
];

