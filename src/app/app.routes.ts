import { Routes } from '@angular/router';
import { SignInComponent } from './pages/auth/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth/sign-up/sign-up.component';
import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';
import { EventDetailComponent } from './pages/events/event-detail/event-detail.component';
import { MaterialsComponent } from './pages/materials/materials.component';
import { MaterialDetailComponent } from './pages/materials/material-detail/material-detail.component';
import { MaterialsReservationsComponent } from './pages/materials/materials-reservations/materials-reservations.component';
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
import { MarkReservationUsedComponent } from './pages/mark-reservation-used/mark-reservation-used';

import { authGuard } from './core/guards/auth.guard';
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
  { path: 'auth/sign-in', component: SignInComponent },
  { path: 'auth/sign-up', component: SignUpComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  { path: 'auth/reset-password', component: ResetPasswordComponent },

  { path: 'home', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'events/:id', component: EventDetailComponent },
  { path: 'materials', component: MaterialsComponent },
  { path: 'materials/:id', component: MaterialDetailComponent },
  { path: 'materials-reservations', component: MaterialsReservationsComponent, canActivate: [authGuard] },
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

  // ── Pages publiques ──────────────────────────────────────────────
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events/events.component').then((m) => m.EventsComponent),
  },
  {
    path: 'films',
    loadComponent: () => import('./pages/films/films.component').then((m) => m.FilmsComponent),
  },
  // ── Ajout de Wiam : page détail film ────────────────────────────
  {
    path: 'films/:id',
    loadComponent: () =>
      import('./pages/films/film-detail/film-detail.component').then(
        (m) => m.FilmDetailComponent,
      ),
  },
  {
    path: 'cinemas',
    loadComponent: () =>
      import('./pages/cinemas/cinemas.component').then((m) => m.CinemasComponent),
  },
  {
    path: 'clubs',
    loadComponent: () => import('./pages/clubs/clubs.component').then((m) => m.ClubsComponent),
  },
  {
    path: 'subscriptions',
    loadComponent: () =>
      import('./pages/subscriptions/subscriptions.component').then(
        (m) => m.SubscriptionsComponent,
      ),
  },
  {
    path: 'logistics',
    loadComponent: () =>
      import('./pages/logistics/logistics.component').then((m) => m.LogisticsComponent),
  },

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
    component: MarkReservationUsedComponent
  },
  // ════════════════════════════════════════════════════════════════
  // ESPACE ADMIN
  // adminGuard vérifie : connecté + (SUPER_ADMIN | ADMIN_CINEMA | ADMIN_EVENT | ADMIN_CLUB)
  // permissionGuard vérifie la permission spécifique à la page
  // SUPER_ADMIN a ADMIN_MANAGE → passe tous les permissionGuard
  // ════════════════════════════════════════════════════════════════
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Page accès refusé
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./admin/pages/unauthorized/admin-unauthorized.component').then(
            (m) => m.AdminUnauthorizedComponent,
          ),
      },

      // Dashboard — tous les admins
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/pages/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },

      // Events
      {
        path: 'events',
        loadComponent: () =>
          import('./admin/pages/events/admin-events.component').then(
            (m) => m.AdminEventsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      // Films
      {
        path: 'films',
        loadComponent: () =>
          import('./admin/pages/films/admin-films.component').then((m) => m.AdminFilmsComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Cinémas
      {
        path: 'cinemas',
        loadComponent: () =>
          import('./admin/pages/cinemas/admin-cinemas.component').then(
            (m) => m.AdminCinemasComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Tickets
      {
        path: 'tickets',
        loadComponent: () =>
          import('./admin/pages/tickets/admin-tickets.component').then(
            (m) => m.AdminTicketsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      // Club
      {
        path: 'club',
        loadComponent: () =>
          import('./admin/pages/club/admin-club.component').then((m) => m.AdminClubComponent),
        canActivate: [permissionGuard(['CLUB_MANAGE', 'ADMIN_MANAGE'])],
      },

      // Détail event club
      {
        path: 'club/events/:id',
        loadComponent: () =>
          import('./admin/pages/club-event-detail/admin-club-event-detail.component').then(
            (m) => m.AdminClubEventDetailComponent,
          ),
        canActivate: [permissionGuard(['CLUB_MANAGE', 'ADMIN_MANAGE'])],
      },

      // Chat
      {
        path: 'chat',
        loadComponent: () =>
          import('./admin/pages/chat/admin-chat.component').then((m) => m.AdminChatComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Détail chat
      {
        path: 'chat/:id',
        loadComponent: () =>
          import('./admin/pages/chat/admin-chat-detail.component').then(
            (m) => m.AdminChatDetailComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Subscriptions
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./admin/pages/subscriptions/admin-subscriptions.component').then(
            (m) => m.AdminSubscriptionsComponent,
          ),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Users
      {
        path: 'users',
        loadComponent: () =>
          import('./admin/pages/users/admin-users.component').then((m) => m.AdminUsersComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Loyalty
      {
        path: 'loyalty',
        loadComponent: () =>
          import('./admin/pages/loyalty/admin-loyalty.component').then(
            (m) => m.AdminLoyaltyComponent,
          ),
        canActivate: [permissionGuard(['FIDELITY_UPDATE', 'ADMIN_MANAGE'])],
      },

      // Roles
      {
        path: 'roles',
        loadComponent: () =>
          import('./admin/pages/roles/admin-roles.component').then((m) => m.AdminRolesComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Logistics
      {
        path: 'logistics',
        loadComponent: () =>
          import('./admin/pages/logistics/admin-logistics.component').then(
            (m) => m.AdminLogisticsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Feedback
      {
        path: 'feedback',
        loadComponent: () =>
          import('./admin/pages/feedback/admin-feedback.component').then(
            (m) => m.AdminFeedbackComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      // Intelligence Artificielle
      {
        path: 'ml',
        loadComponent: () =>
          import('./admin/pages/ml/admin-ml.component').then((m) => m.AdminMlComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Notifications
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
