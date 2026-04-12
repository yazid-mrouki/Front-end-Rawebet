import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {

  private client!: Client;
  private messageSubject = new Subject<ChatMessage>();
  private connectedSubject = new BehaviorSubject<boolean>(false);

  // Compteur pour ignorer les callbacks d'anciens clients (race condition)
  private connectionId = 0;

  messages$ = this.messageSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(chatSessionId: number, token: string | null): void {
    const id = ++this.connectionId;

    if (this.client?.active) {
      this.client.deactivate();
    }
    this.ngZone.run(() => this.connectedSubject.next(false));

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,

      onConnect: () => {
        if (this.connectionId !== id) return;
        this.client.subscribe(
          `/topic/chat/${chatSessionId}`,
          (frame: IMessage) => {
            if (this.connectionId !== id) return;
            const message: ChatMessage = JSON.parse(frame.body);
            this.ngZone.run(() => this.messageSubject.next(message));
          }
        );
        this.ngZone.run(() => this.connectedSubject.next(true));
      },

      onDisconnect: () => {
        if (this.connectionId !== id) return;
        this.ngZone.run(() => this.connectedSubject.next(false));
      },

      onStompError: (frame) => {
        if (this.connectionId !== id) return;
        console.error('[WebSocket] Erreur STOMP :', frame.headers['message']);
        this.ngZone.run(() => this.connectedSubject.next(false));
      },

      onWebSocketClose: (evt) => {
        if (this.connectionId !== id) return;
        console.warn('[WebSocket] Connexion fermée :', evt);
        this.ngZone.run(() => this.connectedSubject.next(false));
      },

      onWebSocketError: (evt) => {
        if (this.connectionId !== id) return;
        console.error('[WebSocket] Erreur connexion :', evt);
        this.ngZone.run(() => this.connectedSubject.next(false));
      },
    });

    this.client.activate();
  }

  // Retourne true si le message a été publié, false si la connexion n'est pas établie.
  sendMessage(chatSessionId: number, content: string): boolean {
    if (!this.client?.connected) return false;

    this.client.publish({
      destination: `/app/chat/${chatSessionId}/send`,
      body: JSON.stringify({ content }),
    });
    return true;
  }

  disconnect(): void {
    this.connectionId++; // invalide tous les callbacks en cours
    if (this.client?.active) {
      this.client.deactivate();
    }
    this.ngZone.run(() => this.connectedSubject.next(false));
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}