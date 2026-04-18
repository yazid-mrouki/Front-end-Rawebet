import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, ChangeDetectorRef, HostBinding, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatSessionService } from '../../services/chat-session.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatSession } from '../../models/chat-session.model';
import { ChatMessage, MessagePage, SessionReactions, UnsendEvent } from '../../models/chat-message.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy {

  @HostBinding('class.chat-active') get chatActive() { return this.joined; }
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  session: ChatSession | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  codeInput = '';

  loading = false;
  joined = false;
  showLoginPopup = false;
  errorMessage = '';
  sessionExpired = false;

  // ✅ Spoiler
  revealedSpoilers = new Set<number>();

  isAtBottom = true;
  showScrollButton = false;
  newMessageCount = 0;

  timeRemainingLabel = '';
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  wsConnected = false;

  typingLabel = '';
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingThrottleTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingSub!: Subscription;

  reactions: Record<number, SessionReactions> = {};
  activePickerMsgId: number | null = null;
  activeTooltipKey: string | null = null;
  readonly EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];
  private reactionSub!: Subscription;
  private unsendSub!: Subscription;
  private editSub!: Subscription;
  private spoilerSub!: Subscription; // ✅ nouveau

  activeMenuMsgId: number | null = null;
  confirmDelete: { msg: ChatMessage; forEveryone: boolean } | null = null;

  summary = '';
  summaryLoading = false;
  summaryError = '';
  private readonly CLAUDE_API_KEY = environment.claudeApiKey;
  editingMsgId: number | null = null;
  editContent = '';

  currentPage = 0;
  readonly PAGE_SIZE = 20;
  hasMore = false;
  loadingMore = false;

  private wsSub!: Subscription;
  private wsConnSub!: Subscription;
  private expiryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private sessionService: ChatSessionService,
    private wsService: ChatWebSocketService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get isLoggedIn(): boolean { return this.auth.isAuthenticated(); }
  get currentUsername(): string { return this.auth.getCurrentUserName(); }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const code = this.route.snapshot.paramMap.get('code');
    if (code) { this.codeInput = code; this.joinChat(); }
  }

  joinChat(): void {
    const code = this.codeInput.trim();
    if (!code) return;
    if (!this.route.snapshot.paramMap.get('code')) {
      this.router.navigate(['/chat/join', code]);
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.sessionService.joinByCode(code).subscribe({
      next: (session) => {
        this.session = session;
        this.loadHistoryAndConnect(session.active === false);
      },
      error: () => {
        this.errorMessage = 'Code invalide. Vérifiez le code affiché dans la salle.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadHistoryAndConnect(alreadyExpired = false): void {
    if (!this.session) return;

    this.sessionService.getMessages(this.session.id, 0, this.PAGE_SIZE).subscribe({
      next: (page: MessagePage) => {
        this.messages = page.messages;
        this.currentPage = 0;
        this.hasMore = page.hasMore;
        this.loading = false;
        this.joined = true;

        if (alreadyExpired) {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.sessionExpired = true;
              this.cdr.detectChanges();
            });
          }, 0);
        }

        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);

        this.sessionService.getReactions(this.session!.id).subscribe({
          next: (r) => { this.reactions = r; this.cdr.detectChanges(); },
          error: () => console.warn('[Reactions] Chargement initial échoué')
        });

        if (isPlatformBrowser(this.platformId)) {
          const token = this.auth.getToken();
          this.wsService.connect(this.session!.id, token);

          this.wsConnSub = this.wsService.connected$.subscribe(connected => {
            this.wsConnected = connected;
            this.cdr.detectChanges();
          });

          this.wsSub = this.wsService.messages$.subscribe(msg => {
            this.messages.push(msg);
            if (this.isAtBottom) setTimeout(() => this.scrollToBottom(), 0);
            else { this.newMessageCount++; this.showScrollButton = true; }
            this.cdr.detectChanges();
          });

          this.typingSub = this.wsService.typing$.subscribe(username => {
            if (username === this.currentUsername) return;
            this.typingLabel = `${username} est en train d'écrire…`;
            this.cdr.detectChanges();
            if (this.typingTimeout !== null) { clearTimeout(this.typingTimeout); this.typingTimeout = null; }
            this.typingTimeout = setTimeout(() => {
              this.typingLabel = '';
              this.cdr.detectChanges();
            }, 10000);
          });

          this.reactionSub = this.wsService.reaction$.subscribe(event => {
            this.reactions[event.messageId] = {
              counts: event.counts,
              users: event.users
            };
            this.cdr.detectChanges();
          });

          // ✅ Abonnement spoiler — met à jour le message en temps réel
          this.spoilerSub = this.wsService.spoiler$.subscribe(event => {
            const msg = this.messages.find(m => m.id === event.messageId);
            if (msg) {
              msg.spoiler = event.isSpoiler;
              this.cdr.detectChanges();
            }
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

  // ── Spoiler ────────────────────────────────────────────────────────────────

  revealSpoiler(msgId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.revealedSpoilers = new Set(this.revealedSpoilers).add(msgId);
    this.cdr.detectChanges();
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  loadMoreMessages(): void {
    if (this.loadingMore || !this.hasMore || !this.session) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;

    const container = this.messagesContainer?.nativeElement as HTMLElement;
    const scrollHeightBefore = container?.scrollHeight ?? 0;

    this.sessionService.getMessages(this.session.id, nextPage, this.PAGE_SIZE).subscribe({
      next: (page: MessagePage) => {
        this.messages = [...page.messages, ...this.messages];
        this.currentPage = nextPage;
        this.hasMore = page.hasMore;
        this.loadingMore = false;
        this.cdr.detectChanges();

        if (container) {
          const added = container.scrollHeight - scrollHeightBefore;
          container.scrollTop = added;
        }
      },
      error: () => {
        this.loadingMore = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Réactions ──────────────────────────────────────────────────────────────

  togglePicker(msgId: number, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isLoggedIn) { this.showLoginPopup = true; return; }
    this.activeTooltipKey = null;
    this.activePickerMsgId = this.activePickerMsgId === msgId ? null : msgId;
  }

  onReact(msgId: number, emoji: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isLoggedIn || !this.session || !this.wsConnected) return;

    const current = this.reactions[msgId] ?? { counts: {}, users: {} };
    const counts = { ...current.counts };
    const users = Object.fromEntries(
      Object.entries(current.users ?? {}).map(([e, arr]) => [e, [...arr]])
    );
    const username = this.currentUsername;

    let previousEmoji: string | null = null;
    for (const [e, names] of Object.entries(users)) {
      if (names.includes(username)) { previousEmoji = e; break; }
    }

    if (previousEmoji) {
      users[previousEmoji] = users[previousEmoji].filter(n => n !== username);
      counts[previousEmoji] = Math.max(0, (counts[previousEmoji] ?? 1) - 1);
      if (counts[previousEmoji] === 0) {
        delete counts[previousEmoji];
        delete users[previousEmoji];
      }
    }

    if (previousEmoji !== emoji) {
      counts[emoji] = (counts[emoji] ?? 0) + 1;
      users[emoji] = [...(users[emoji] ?? []), username];
    }

    this.reactions = { ...this.reactions, [msgId]: { counts, users } };
    this.activePickerMsgId = null;
    this.activeTooltipKey = null;
    this.cdr.detectChanges();
    this.wsService.sendReaction(this.session.id, msgId, emoji);
  }

  getReactionEntries(msgId: number): { emoji: string; count: number; names: string[] }[] {
    const data = this.reactions[msgId];
    if (!data?.counts) return [];
    return Object.entries(data.counts)
      .filter(([, count]) => count > 0)
      .map(([emoji, count]) => ({
        emoji,
        count,
        names: data.users?.[emoji] ?? []
      }));
  }

  toggleTooltip(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activePickerMsgId = null;
    this.activeTooltipKey = this.activeTooltipKey === key ? null : key;
  }

  // ── Résumé IA ──────────────────────────────────────────────────────────────

  async generateSummary(): Promise<void> {
    if (this.summaryLoading || !this.session) return;
    this.summaryLoading = true;
    this.summaryError = '';
    this.summary = '';
    this.cdr.detectChanges();

    try {
      const messagesText = this.messages
        .filter(m => !m.deleted)
        .map(m => `${m.username} : ${m.content}`)
        .join('\n');

      const prompt = `Tu es un assistant cinéphile expert. Voici les messages d'une discussion en temps réel sur le film "${this.session!.name}".
Résume en français les points clés débattus, les opinions exprimées et les moments forts de la discussion en 5-8 phrases maximum. Sois concis et engageant.

Messages :
${messagesText}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      this.summary = data.content?.[0]?.text ?? 'Aucun résumé généré.';
    } catch (err) {
      this.summaryError = 'Erreur lors de la génération du résumé.';
      console.error('[Summary] Erreur:', err);
    } finally {
      this.summaryLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Unsend / Edit ──────────────────────────────────────────────────────────

  toggleMenu(msgId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeMenuMsgId = this.activeMenuMsgId === msgId ? null : msgId;
    this.activePickerMsgId = null;
    this.activeTooltipKey = null;
  }

  confirmUnsend(msg: ChatMessage, forEveryone: boolean, event: MouseEvent): void {
    event.stopPropagation();
    this.activeMenuMsgId = null;
    this.confirmDelete = { msg, forEveryone };
  }

  cancelDelete(): void {
    this.confirmDelete = null;
  }

  executeDelete(): void {
    if (!this.confirmDelete || !this.session) return;
    const { msg, forEveryone } = this.confirmDelete;
    this.confirmDelete = null;

    if (forEveryone) {
      msg.deleted = true;
      msg.content = '';
    } else {
      this.messages = this.messages.filter(m => m.id !== msg.id);
    }
    this.cdr.detectChanges();
    this.wsService.sendUnsend(this.session.id, msg.id, forEveryone);
  }

  startEdit(msg: ChatMessage, event: MouseEvent): void {
    event.stopPropagation();
    this.editingMsgId = msg.id;
    this.editContent = msg.content;
    this.activeMenuMsgId = null;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingMsgId = null;
    this.editContent = '';
  }

  confirmEdit(msg: ChatMessage): void {
    if (!this.session || !this.editContent.trim() || this.editContent.trim() === msg.content) {
      this.cancelEdit();
      return;
    }
    msg.content = this.editContent.trim();
    msg.edited = true;
    this.editingMsgId = null;
    this.editContent = '';
    this.cdr.detectChanges();
    this.wsService.sendEdit(this.session.id, msg.id, msg.content);
  }

  closeAll(): void {
    this.activePickerMsgId = null;
    this.activeTooltipKey = null;
  }

  // ── Scroll ─────────────────────────────────────────────────────────────────

  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (this.isAtBottom) { this.showScrollButton = false; this.newMessageCount = 0; }
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

  // ── Countdown ──────────────────────────────────────────────────────────────

  private startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 60000);
  }

  private updateCountdown(): void {
    if (!this.session) return;
    const remaining = Math.max(0, new Date(this.session.endTime).getTime() - Date.now());
    const minutes = Math.ceil(remaining / 60000);
    if (minutes <= 0) this.timeRemainingLabel = 'Session terminée';
    else if (minutes < 60) this.timeRemainingLabel = `${minutes} min restante${minutes > 1 ? 's' : ''}`;
    else {
      const h = Math.floor(minutes / 60), m = minutes % 60;
      this.timeRemainingLabel = m > 0 ? `${h}h${m}min` : `${h}h`;
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  private startExpiryTimeout(): void {
    if (!this.session) return;
    const delay = new Date(this.session.endTime).getTime() - Date.now();

    const expire = () => {
      this.ngZone.run(() => {
        this.sessionExpired = true;
        this.wsService.disconnect();
        this.cdr.detectChanges();
      });
    };

    if (delay <= 0) {
      setTimeout(expire, 0);
      return;
    }
    this.expiryTimeout = setTimeout(expire, delay);
  }

  onInputFocus(): void {
    if (!this.isLoggedIn) this.showLoginPopup = true;
  }

  onTyping(): void {
    if (!this.isLoggedIn || !this.session || !this.wsConnected) return;
    if (this.typingThrottleTimeout !== null) return;
    this.wsService.sendTyping(this.session.id);
    this.typingThrottleTimeout = setTimeout(() => {
      this.typingThrottleTimeout = null;
    }, 2000);
  }

  sendMessage(): void {
    if (!this.isLoggedIn) { this.showLoginPopup = true; return; }
    const content = this.newMessage.trim();
    if (!content || !this.session) return;
    const sent = this.wsService.sendMessage(this.session.id, content);
    if (sent) this.newMessage = '';
  }

  onKeyEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  closeLoginPopup(): void { this.showLoginPopup = false; }

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
    this.reactionSub?.unsubscribe();
    this.unsendSub?.unsubscribe();
    this.editSub?.unsubscribe();
    this.spoilerSub?.unsubscribe(); // ✅ nouveau
    this.wsService.disconnect();
    clearTimeout(this.expiryTimeout ?? undefined);
    clearTimeout(this.typingTimeout ?? undefined);
    clearTimeout(this.typingThrottleTimeout ?? undefined);
    clearInterval(this.countdownInterval ?? undefined);
  }
}