import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Routes, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { CLUB_ROUTES } from './club.routes';
import { AuthService } from '../../core/services/auth.service';
import { ClubMemberService } from './services/club-member.service';
import { ClubEventService } from './services/club-event.service';
import { ClubJoinRequestService } from './services/club-join-request.service';
import { ClubParticipationService } from './services/club-participation.service';

// ── Composant vide pour les redirections de guards ───────────────────────────
@Component({ standalone: true, template: '' })
class StubComponent {}

// ── Mocks des services ────────────────────────────────────────────────────────

const mockAuth = {
  isAuthenticated: vi.fn().mockReturnValue(true),
  isSuperAdmin:    vi.fn().mockReturnValue(false),
  hasPermission:   vi.fn().mockReturnValue(false),
  isAdmin:         vi.fn().mockReturnValue(false),
  getCurrentUserId:   vi.fn().mockReturnValue(1),
  getCurrentUserName: vi.fn().mockReturnValue('Testeur'),
  getToken: vi.fn().mockReturnValue(null),
  authState: new BehaviorSubject<boolean>(true),
};

const mockMembers = {
  getMyMembership: vi.fn().mockReturnValue(of(null)),
  getAllMembers:    vi.fn().mockReturnValue(of([])),
  leaveClub:       vi.fn().mockReturnValue(of(undefined)),
};

const mockEvents = {
  getEvents:    vi.fn().mockReturnValue(of([])),
  createEvent:  vi.fn().mockReturnValue(of({})),
};

const mockJoinRequests = {
  getMyRequest:       vi.fn().mockReturnValue(of(null)),
  getPendingRequests: vi.fn().mockReturnValue(of([])),
  submitRequest:      vi.fn().mockReturnValue(of({})),
  approve:            vi.fn().mockReturnValue(of({})),
  reject:             vi.fn().mockReturnValue(of({})),
};

const mockParticipations = {
  myReservations: vi.fn().mockReturnValue(of([])),
  cancel:         vi.fn().mockReturnValue(of(undefined)),
  reserve:        vi.fn().mockReturnValue(of({})),
};

// ── Table de routes de test ───────────────────────────────────────────────────
// On ajoute /auth/sign-in et /club comme cibles des redirections de guards.
const TEST_ROUTES: Routes = [
  { path: 'auth/sign-in', component: StubComponent },
  { path: 'club', children: CLUB_ROUTES },
  { path: '**', redirectTo: 'club' },
];

// ── Fournisseurs communs ──────────────────────────────────────────────────────
function testProviders() {
  return [
    provideRouter(TEST_ROUTES),
    provideLocationMocks(),
    { provide: PLATFORM_ID,            useValue: 'browser' },
    { provide: AuthService,            useValue: mockAuth },
    { provide: ClubMemberService,      useValue: mockMembers },
    { provide: ClubEventService,       useValue: mockEvents },
    { provide: ClubJoinRequestService, useValue: mockJoinRequests },
    { provide: ClubParticipationService, useValue: mockParticipations },
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
describe('Club — Tests de navigation', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });

    // État par défaut : connecté, sans droits admin
    mockAuth.isAuthenticated.mockReturnValue(true);
    mockAuth.isSuperAdmin.mockReturnValue(false);
    mockAuth.hasPermission.mockReturnValue(false);
    mockMembers.getMyMembership.mockReturnValue(of(null));
    mockMembers.getAllMembers.mockReturnValue(of([]));
    mockEvents.getEvents.mockReturnValue(of([]));
    mockJoinRequests.getMyRequest.mockReturnValue(of(null));
    mockJoinRequests.getPendingRequests.mockReturnValue(of([]));
    mockParticipations.myReservations.mockReturnValue(of([]));
  });

  afterEach(() => vi.clearAllMocks());

  // ── 1. Chargement des composants ──────────────────────────────────────────
  describe('1 — Chargement des composants (sans erreur)', () => {

    it('/club → ClubHomeComponent se charge', async () => {
      const harness = await RouterTestingHarness.create('/club');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/club');
    });

    it('/club/events → ClubEventsComponent se charge', async () => {
      const harness = await RouterTestingHarness.create('/club/events');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/club/events');
    });

    it('/club/members → ClubMembersComponent se charge', async () => {
      const harness = await RouterTestingHarness.create('/club/members');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/club/members');
    });

    it('/club/join → ClubJoinComponent se charge (utilisateur connecté)', async () => {
      const harness = await RouterTestingHarness.create('/club/join');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/club/join');
    });

    it('/club/my-reservations → ClubParticipationsComponent se charge (connecté)', async () => {
      const harness = await RouterTestingHarness.create('/club/my-reservations');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/club/my-reservations');
    });

    it('/club/admin → ClubAdminComponent se charge (SUPER_ADMIN)', async () => {
      mockAuth.isSuperAdmin.mockReturnValue(true);
      const harness = await RouterTestingHarness.create('/club/admin');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/club/admin');
    });

  });

  // ── 2. Navigation interne ─────────────────────────────────────────────────
  describe('2 — Navigation interne', () => {

    it('navigue de /club vers /club/events', async () => {
      const harness = await RouterTestingHarness.create('/club');
      await harness.navigateByUrl('/club/events');
      expect(TestBed.inject(Router).url).toBe('/club/events');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /club/events vers /club/members', async () => {
      const harness = await RouterTestingHarness.create('/club/events');
      await harness.navigateByUrl('/club/members');
      expect(TestBed.inject(Router).url).toBe('/club/members');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /club/members vers /club/join', async () => {
      const harness = await RouterTestingHarness.create('/club/members');
      await harness.navigateByUrl('/club/join');
      expect(TestBed.inject(Router).url).toBe('/club/join');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /club vers /club/my-reservations', async () => {
      const harness = await RouterTestingHarness.create('/club');
      await harness.navigateByUrl('/club/my-reservations');
      expect(TestBed.inject(Router).url).toBe('/club/my-reservations');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /club/events vers /club (retour)', async () => {
      const harness = await RouterTestingHarness.create('/club/events');
      await harness.navigateByUrl('/club');
      expect(TestBed.inject(Router).url).toBe('/club');
      expect(harness.routeNativeElement).not.toBeNull();
    });

  });

  // ── 3. authGuard ──────────────────────────────────────────────────────────
  describe('3 — authGuard — routes protégées', () => {

    it('/club/join est accessible quand connecté', async () => {
      mockAuth.isAuthenticated.mockReturnValue(true);
      const harness = await RouterTestingHarness.create('/club/join');
      expect(TestBed.inject(Router).url).toBe('/club/join');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('/club/my-reservations est accessible quand connecté', async () => {
      mockAuth.isAuthenticated.mockReturnValue(true);
      const harness = await RouterTestingHarness.create('/club/my-reservations');
      expect(TestBed.inject(Router).url).toBe('/club/my-reservations');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('/club/join redirige vers /auth/sign-in si non connecté', async () => {
      mockAuth.isAuthenticated.mockReturnValue(false);
      await RouterTestingHarness.create('/club/join');
      expect(TestBed.inject(Router).url).toContain('/auth/sign-in');
    });

    it('/club/my-reservations redirige vers /auth/sign-in si non connecté', async () => {
      mockAuth.isAuthenticated.mockReturnValue(false);
      await RouterTestingHarness.create('/club/my-reservations');
      expect(TestBed.inject(Router).url).toContain('/auth/sign-in');
    });

  });

  // ── 4. clubAdminGuard ─────────────────────────────────────────────────────
  describe('4 — clubAdminGuard — /club/admin', () => {

    it('accessible si SUPER_ADMIN', async () => {
      mockAuth.isSuperAdmin.mockReturnValue(true);
      const harness = await RouterTestingHarness.create('/club/admin');
      expect(TestBed.inject(Router).url).toBe('/club/admin');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('accessible si permission CLUB_MANAGE', async () => {
      mockAuth.hasPermission.mockImplementation((p: string) => p === 'CLUB_MANAGE');
      const harness = await RouterTestingHarness.create('/club/admin');
      expect(TestBed.inject(Router).url).toBe('/club/admin');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('redirige vers /club si connecté mais sans permission admin', async () => {
      mockAuth.isAuthenticated.mockReturnValue(true);
      mockAuth.isSuperAdmin.mockReturnValue(false);
      mockAuth.hasPermission.mockReturnValue(false);
      await RouterTestingHarness.create('/club/admin');
      expect(TestBed.inject(Router).url).toBe('/club');
    });

    it('redirige vers /auth/sign-in si non connecté', async () => {
      mockAuth.isAuthenticated.mockReturnValue(false);
      await RouterTestingHarness.create('/club/admin');
      expect(TestBed.inject(Router).url).toContain('/auth/sign-in');
    });

  });

});
