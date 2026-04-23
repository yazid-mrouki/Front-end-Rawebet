import { Routes } from '@angular/router';
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
      import('./pages/subscriptions/subscriptions.component').then((m) => m.SubscriptionsComponent),
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
      import('./pages/notifications/notifications.component').then((m) => m.NotificationsComponent),
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

      // Dashboard — tousles admins (pas de permission guard)
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/pages/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },

      // Events — ADMIN_CINEMA (CINEMA_CREATE) + ADMIN_EVENT (EVENT_CREATE) + SUPER_ADMIN (ADMIN_MANAGE)
      {
        path: 'events',
        loadComponent: () =>
          import('./admin/pages/events/admin-events.component').then((m) => m.AdminEventsComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      // Films — ADMIN_CINEMA (CINEMA_CREATE) + SUPER_ADMIN (ADMIN_MANAGE)
      {
        path: 'films',
        loadComponent: () =>
          import('./admin/pages/films/admin-films.component').then((m) => m.AdminFilmsComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Cinémas — ADMIN_CINEMA + SUPER_ADMIN
      {
        path: 'cinemas',
        loadComponent: () =>
          import('./admin/pages/cinemas/admin-cinemas.component').then(
            (m) => m.AdminCinemasComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Tickets — ADMIN_CINEMA + ADMIN_EVENT + SUPER_ADMIN
      {
        path: 'tickets',
        loadComponent: () =>
          import('./admin/pages/tickets/admin-tickets.component').then(
            (m) => m.AdminTicketsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      // Club — ADMIN_CLUB (CLUB_MANAGE) + SUPER_ADMIN (ADMIN_MANAGE)
      {
        path: 'club',
        loadComponent: () =>
          import('./admin/pages/club/admin-club.component').then((m) => m.AdminClubComponent),
        canActivate: [permissionGuard(['CLUB_MANAGE', 'ADMIN_MANAGE'])],
      },

      // Détail event club — ADMIN_CLUB + SUPER_ADMIN
      {
        path: 'club/events/:id',
        loadComponent: () =>
          import('./admin/pages/club-event-detail/admin-club-event-detail.component').then(
            (m) => m.AdminClubEventDetailComponent,
          ),
        canActivate: [permissionGuard(['CLUB_MANAGE', 'ADMIN_MANAGE'])],
      },

      // Chat — ADMIN_CINEMA (CINEMA_CREATE) + SUPER_ADMIN (ADMIN_MANAGE)
      {
        path: 'chat',
        loadComponent: () =>
          import('./admin/pages/chat/admin-chat.component').then((m) => m.AdminChatComponent),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Détail chat — ADMIN_CINEMA + SUPER_ADMIN
      {
        path: 'chat/:id',
        loadComponent: () =>
          import('./admin/pages/chat/admin-chat-detail.component').then(
            (m) => m.AdminChatDetailComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Subscriptions — SUPER_ADMIN uniquement
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./admin/pages/subscriptions/admin-subscriptions.component').then(
            (m) => m.AdminSubscriptionsComponent,
          ),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Users — SUPER_ADMIN uniquement
      {
        path: 'users',
        loadComponent: () =>
          import('./admin/pages/users/admin-users.component').then((m) => m.AdminUsersComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Loyalty — SUPER_ADMIN uniquement
      {
        path: 'loyalty',
        loadComponent: () =>
          import('./admin/pages/loyalty/admin-loyalty.component').then(
            (m) => m.AdminLoyaltyComponent,
          ),
        canActivate: [permissionGuard(['FIDELITY_UPDATE', 'ADMIN_MANAGE'])],
      },

      // Roles — SUPER_ADMIN uniquement
      {
        path: 'roles',
        loadComponent: () =>
          import('./admin/pages/roles/admin-roles.component').then((m) => m.AdminRolesComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Logistics — ADMIN_CINEMA + SUPER_ADMIN
      {
        path: 'logistics',
        loadComponent: () =>
          import('./admin/pages/logistics/admin-logistics.component').then(
            (m) => m.AdminLogisticsComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'ADMIN_MANAGE'])],
      },

      // Feedback — ADMIN_CINEMA + ADMIN_EVENT + SUPER_ADMIN
      {
        path: 'feedback',
        loadComponent: () =>
          import('./admin/pages/feedback/admin-feedback.component').then(
            (m) => m.AdminFeedbackComponent,
          ),
        canActivate: [permissionGuard(['CINEMA_CREATE', 'EVENT_CREATE', 'ADMIN_MANAGE'])],
      },

      // Intelligence Artificielle — SUPER_ADMIN uniquement
      {
        path: 'ml',
        loadComponent: () =>
          import('./admin/pages/ml/admin-ml.component').then((m) => m.AdminMlComponent),
        canActivate: [permissionGuard(['ADMIN_MANAGE'])],
      },

      // Notifications — tous les admins
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
