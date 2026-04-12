import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatSessionService } from '../../services/chat-session.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatSession } from '../../models/chat-session.model';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // État général
  session: ChatSession | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  codeInput = '';

  // États UI
  loading = false;
  joined = false;
  showLoginPopup = false;
  errorMessage = '';
  sessionExpired = false;

  // C2 — Scroll intelligent
  isAtBottom = true;
  showScrollButton = false;
  newMessageCount = 0;

  // C3 — Countdown
  timeRemainingLabel = '';
  private countdownInterval!: ReturnType<typeof setInterval>;

  wsConnected = false;

  // Typing indicator
  typingLabel = '';
  private typingTimeout!: ReturnType<typeof setTimeout>;
  private typingThrottleTimeout!: ReturnType<typeof setTimeout>;
  private typingSub!: Subscription;

  private wsSub!: Subscription;
  private wsConnSub!: Subscription;
  private expiryTimeout!: ReturnType<typeof setTimeout>;

  constructor(
    private sessionService: ChatSessionService,
    private wsService: ChatWebSocketService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get isLoggedIn(): boolean {
    return this.auth.isAuthenticated();
  }

  get currentUsername(): string {
    return this.auth.getCurrentUserName();
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return; // garde SSR

    const code = this.route.snapshot.paramMap.get('code');
    if (code) {
      this.codeInput = code;
      this.joinChat();
    }
  }

  joinChat(): void {
    const code = this.codeInput.trim();
    if (!code) return;

    // Si l'URL n'a pas encore le code, on navigue vers /chat/join/{code}.
    // Le nouveau composant instancié par la route lira le param et rappellera joinChat().
    if (!this.route.snapshot.paramMap.get('code')) {
      this.router.navigate(['/chat/join', code]);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.sessionService.joinByCode(code).subscribe({
      next: (session) => {
        if (!session.active) {
          this.errorMessage = 'Cette session de chat est terminée.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        this.session = session;
        this.loadHistoryAndConnect();
      },
      error: () => {
        this.errorMessage = 'Code invalide. Vérifiez le code affiché dans la salle.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadHistoryAndConnect(): void {
    if (!this.session) return;

    this.sessionService.getMessages(this.session.id).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loading = false;
        this.joined = true;
        this.cdr.detectChanges();

        setTimeout(() => this.scrollToBottom(), 0);

        if (isPlatformBrowser(this.platformId)) { // WebSocket = browser uniquement
          const token = this.auth.getToken();
          this.wsService.connect(this.session!.id, token);

          this.wsConnSub = this.wsService.connected$.subscribe((connected) => {
            this.wsConnected = connected;
            this.cdr.detectChanges();
          });

          this.wsSub = this.wsService.messages$.subscribe((msg) => {
            console.log('[Chat] message reçu via subscription', msg);
            this.messages.push(msg);
            if (this.isAtBottom) {
              setTimeout(() => this.scrollToBottom(), 0);
            } else {
              this.newMessageCount++;
              this.showScrollButton = true;
            }
            this.cdr.detectChanges();
          });

          this.typingSub = this.wsService.typing$.subscribe((username) => {
            if (username === this.currentUsername) return;
            this.typingLabel = `${username} est en train d'écrire…`;
            this.cdr.detectChanges();
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
              this.typingLabel = '';
              this.cdr.detectChanges();
            }, 3000);
          });
        }

        this.startExpiryTimeout();
        this.startCountdown();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les messages.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // C2 — Tracking du scroll
  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (this.isAtBottom) {
      this.showScrollButton = false;
      this.newMessageCount = 0;
    }
  }

  scrollToLatest(): void {
    this.scrollToBottom();
    this.showScrollButton = false;
    this.newMessageCount = 0;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // C3 — Countdown
  private startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 60000);
  }

  private updateCountdown(): void {
    if (!this.session) return;
    const remaining = Math.max(0, new Date(this.session.endTime).getTime() - Date.now());
    const minutes = Math.ceil(remaining / 60000);
    if (minutes <= 0) {
      this.timeRemainingLabel = 'Session terminée';
    } else if (minutes < 60) {
      this.timeRemainingLabel = `${minutes} min restante${minutes > 1 ? 's' : ''}`;
    } else {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      this.timeRemainingLabel = m > 0 ? `${h}h${m}min` : `${h}h`;
    }
  }

  // C4 — Auto-resize textarea
  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  // Bug 7 — setTimeout exact (pas setInterval)
  private startExpiryTimeout(): void {
    if (!this.session) return;
    const delay = new Date(this.session.endTime).getTime() - Date.now();
    if (delay <= 0) {
      this.sessionExpired = true;
      this.wsService.disconnect();
      return;
    }
    this.expiryTimeout = setTimeout(() => {
      this.sessionExpired = true;
      this.wsService.disconnect();
    }, delay);
  }

  onInputFocus(): void {
    if (!this.isLoggedIn) {
      this.showLoginPopup = true;
    }
  }

  onTyping(): void {
    if (!this.isLoggedIn || !this.session || !this.wsConnected) return;
    // Throttle : envoie au plus 1 événement toutes les 2s
    if (this.typingThrottleTimeout) return;
    this.wsService.sendTyping(this.session.id);
    this.typingThrottleTimeout = setTimeout(() => {
      clearTimeout(this.typingThrottleTimeout);
      (this as any).typingThrottleTimeout = null;
    }, 2000);
  }

  sendMessage(): void {
    if (!this.isLoggedIn) {
      this.showLoginPopup = true;
      return;
    }
    const content = this.newMessage.trim();
    console.log('sendMessage appelé', content);
    console.log('session', this.session);
    console.log('wsConnected', this.wsConnected);
    if (!content || !this.session) return;
    const sent = this.wsService.sendMessage(this.session.id, content);
    console.log('résultat envoi', sent);
    if (sent) {
      this.newMessage = '';
    }
  }

  onKeyEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  closeLoginPopup(): void {
    this.showLoginPopup = false;
  }

  // C1 — returnUrl pour redirect post-login
  goToLogin(): void {
    this.router.navigate(['/auth/sign-in'], {
      queryParams: { returnUrl: `/chat/join/${this.codeInput}` }
    });
  }

  isMyMessage(msg: ChatMessage): boolean {
    return msg.userId === this.auth.getCurrentUserId();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsConnSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    this.wsService.disconnect();
    clearTimeout(this.expiryTimeout);
    clearTimeout(this.typingTimeout);
    clearTimeout(this.typingThrottleTimeout);
    clearInterval(this.countdownInterval);
  }
}
