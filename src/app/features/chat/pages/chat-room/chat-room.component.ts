import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {

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

  private wsSub!: Subscription;
  private expiryInterval!: ReturnType<typeof setInterval>;

  constructor(
    private sessionService: ChatSessionService,
    private wsService: ChatWebSocketService,
    public auth: AuthService,
    private route: ActivatedRoute
  ) {}

  get isLoggedIn(): boolean {
    return this.auth.isAuthenticated();
  }

  get currentUsername(): string {
    return this.auth.getCurrentUserName();
  }

  ngOnInit(): void {
    // Support URL directe /chat/join/:code
    const code = this.route.snapshot.paramMap.get('code');
    if (code) {
      this.codeInput = code;
      this.joinChat();
    }
  }

  joinChat(): void {
    if (!this.codeInput.trim()) return;

    this.loading = true;
    this.errorMessage = '';

    this.sessionService.joinByCode(this.codeInput.trim()).subscribe({
      next: (session) => {
        if (!session.active) {
          this.errorMessage = 'Cette session de chat est terminée.';
          this.loading = false;
          return;
        }

        this.session = session;
        this.loadHistoryAndConnect();
      },
      error: () => {
        this.errorMessage = 'Code invalide. Vérifiez le code affiché dans la salle.';
        this.loading = false;
      }
    });
  }

  private loadHistoryAndConnect(): void {
    if (!this.session) return;

    // Charger l'historique (public, pas besoin de token)
    this.sessionService.getMessages(this.session.id).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loading = false;
        this.joined = true;

        // Connexion WebSocket (avec token si connecté, sans token sinon)
        const token = this.auth.getToken();
        this.wsService.connect(this.session!.id, token);

        // Écouter les nouveaux messages en temps réel
        this.wsSub = this.wsService.messages$.subscribe((msg) => {
          this.messages.push(msg);
        });

        // Vérifier l'expiration toutes les 30 secondes
        this.startExpiryCheck();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les messages.';
        this.loading = false;
      }
    });
  }

  // Appelé quand l'utilisateur clique dans la zone de saisie sans être connecté
  onInputFocus(): void {
    if (!this.isLoggedIn) {
      this.showLoginPopup = true;
    }
  }

  sendMessage(): void {
    if (!this.isLoggedIn) {
      this.showLoginPopup = true;
      return;
    }

    const content = this.newMessage.trim();
    if (!content || !this.session) return;

    this.wsService.sendMessage(this.session.id, content);
    this.newMessage = '';
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

  goToLogin(): void {
    // Sauvegarder le code pour revenir après login
    localStorage.setItem('chat_redirect_code', this.codeInput);
    window.location.href = '/auth/sign-in';
  }

  isMyMessage(msg: ChatMessage): boolean {
    return msg.userId === this.auth.getCurrentUserId();
  }

  private startExpiryCheck(): void {
    this.expiryInterval = setInterval(() => {
      if (!this.session) return;
      const now = new Date();
      const end = new Date(this.session.endTime);
      if (now >= end) {
        this.sessionExpired = true;
        this.wsService.disconnect();
        clearInterval(this.expiryInterval);
      }
    }, 30000);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
    clearInterval(this.expiryInterval);
  }
}