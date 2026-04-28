import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Routes, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { CHAT_ROUTES } from './chat.routes';
import { AuthService } from '../../core/services/auth.service';
import { ChatSessionService } from './services/chat-session.service';
import { ChatWebSocketService } from './services/chat-websocket.service';
import { ChatMessage } from './models/chat-message.model';
import { ChatSession } from './models/chat-session.model';

// ── Composant vide pour les cibles de redirection ─────────────────────────────
@Component({ standalone: true, template: '' })
class StubComponent {}

// ── Session de test (active, expire dans 1h) ──────────────────────────────────
const mockSession: ChatSession = {
  id: 1,
  seanceId: 1,
  name: 'Session Test',
  code: '1234',
  active: true,
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

// ── Mocks des services ────────────────────────────────────────────────────────

const mockAuth = {
  isAuthenticated:    vi.fn().mockReturnValue(false),
  isSuperAdmin:       vi.fn().mockReturnValue(false),
  hasPermission:      vi.fn().mockReturnValue(false),
  isAdmin:            vi.fn().mockReturnValue(false),
  getCurrentUserId:   vi.fn().mockReturnValue(null),
  getCurrentUserName: vi.fn().mockReturnValue(''),
  getToken:           vi.fn().mockReturnValue(null),
  authState: new BehaviorSubject<boolean>(false),
};

// messages$ recréé à chaque test pour éviter les fuites d'abonnements
let wsMessages$: Subject<ChatMessage>;

const mockWs = {
  get messages$() { return wsMessages$.asObservable(); },
  connect:     vi.fn(),
  sendMessage: vi.fn(),
  disconnect:  vi.fn(),
};

const mockChatService = {
  joinByCode:      vi.fn().mockReturnValue(of(mockSession)),
  getMessages:     vi.fn().mockReturnValue(of([])),
  getAllSessions:   vi.fn().mockReturnValue(of([])),
  closeSession:    vi.fn().mockReturnValue(of(mockSession)),
  restartSession:  vi.fn().mockReturnValue(of(mockSession)),
  isActive:        vi.fn().mockReturnValue(of(true)),
};

// ── Table de routes de test ───────────────────────────────────────────────────
const TEST_ROUTES: Routes = [
  { path: 'auth/sign-in', component: StubComponent },
  { path: 'chat', children: CHAT_ROUTES },
  { path: '**', redirectTo: 'chat' },
];

// ── Fournisseurs communs ──────────────────────────────────────────────────────
function testProviders() {
  return [
    provideRouter(TEST_ROUTES),
    provideLocationMocks(),
    { provide: PLATFORM_ID,          useValue: 'browser' },
    { provide: AuthService,          useValue: mockAuth },
    { provide: ChatSessionService,   useValue: mockChatService },
    { provide: ChatWebSocketService, useValue: mockWs },
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
describe('Chat — Tests de navigation', () => {

  beforeEach(() => {
    wsMessages$ = new Subject<ChatMessage>();

    TestBed.configureTestingModule({ providers: testProviders() });

    // État par défaut : visiteur anonyme
    mockAuth.isAuthenticated.mockReturnValue(false);
    mockAuth.getToken.mockReturnValue(null);
    mockChatService.joinByCode.mockReturnValue(of(mockSession));
    mockChatService.getMessages.mockReturnValue(of([]));
  });

  afterEach(() => vi.clearAllMocks());

  // ── 1. Chargement des composants ──────────────────────────────────────────
  describe('1 — Chargement des composants (sans erreur)', () => {

    it('/chat → ChatRoomComponent se charge (formulaire de saisie du code)', async () => {
      const harness = await RouterTestingHarness.create('/chat');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/chat');
      // Sans code dans l'URL, joinByCode ne doit pas être appelé
      expect(mockChatService.joinByCode).not.toHaveBeenCalled();
    });

    it('/chat/join → ChatRoomComponent se charge (URL explicite)', async () => {
      const harness = await RouterTestingHarness.create('/chat/join');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/chat/join');
      // Pas de code → pas d'auto-join
      expect(mockChatService.joinByCode).not.toHaveBeenCalled();
    });

    it('/chat/join/1234 → ChatRoomComponent se charge et auto-rejoint la session', async () => {
      const harness = await RouterTestingHarness.create('/chat/join/1234');
      expect(harness.routeNativeElement).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe('/chat/join/1234');
      // Présence d'un code → auto-join déclenché
      expect(mockChatService.joinByCode).toHaveBeenCalledWith('1234');
    });

  });

  // ── 2. Navigation interne ─────────────────────────────────────────────────
  describe('2 — Navigation interne', () => {

    it('navigue de /chat vers /chat/join', async () => {
      const harness = await RouterTestingHarness.create('/chat');
      await harness.navigateByUrl('/chat/join');
      expect(TestBed.inject(Router).url).toBe('/chat/join');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /chat/join vers /chat', async () => {
      const harness = await RouterTestingHarness.create('/chat/join');
      await harness.navigateByUrl('/chat');
      expect(TestBed.inject(Router).url).toBe('/chat');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /chat vers /chat/join/ABCD', async () => {
      const harness = await RouterTestingHarness.create('/chat');
      await harness.navigateByUrl('/chat/join/ABCD');
      expect(TestBed.inject(Router).url).toBe('/chat/join/ABCD');
      expect(harness.routeNativeElement).not.toBeNull();
    });

    it('navigue de /chat/join/1234 vers /chat/join/5678 (changement de session)', async () => {
      const harness = await RouterTestingHarness.create('/chat/join/1234');
      mockChatService.joinByCode.mockClear();
      await harness.navigateByUrl('/chat/join/5678');
      expect(TestBed.inject(Router).url).toBe('/chat/join/5678');
      expect(harness.routeNativeElement).not.toBeNull();
    });

  });

  // ── 3. Paramètre de route :code ───────────────────────────────────────────
  describe('3 — Paramètre de route :code', () => {

    it('joinByCode reçoit le code exact de l\'URL (/chat/join/1234)', async () => {
      await RouterTestingHarness.create('/chat/join/1234');
      expect(mockChatService.joinByCode).toHaveBeenCalledWith('1234');
      expect(mockChatService.joinByCode).toHaveBeenCalledTimes(1);
    });

    it('joinByCode reçoit le code exact de l\'URL (/chat/join/ZQMK)', async () => {
      mockSession.code = 'ZQMK';
      mockChatService.joinByCode.mockReturnValue(of({ ...mockSession, code: 'ZQMK' }));
      await RouterTestingHarness.create('/chat/join/ZQMK');
      expect(mockChatService.joinByCode).toHaveBeenCalledWith('ZQMK');
    });

    it('getMessages est appelé après un join réussi', async () => {
      await RouterTestingHarness.create('/chat/join/1234');
      expect(mockChatService.getMessages).toHaveBeenCalledWith(mockSession.id);
    });

    it('session inactive → getMessages non appelé', async () => {
      mockChatService.joinByCode.mockReturnValue(of({ ...mockSession, active: false }));
      await RouterTestingHarness.create('/chat/join/1234');
      expect(mockChatService.getMessages).not.toHaveBeenCalled();
    });

  });

});
