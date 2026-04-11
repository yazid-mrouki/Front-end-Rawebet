import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {

  private client!: Client;
  private messageSubject = new Subject<ChatMessage>();

  // Observable que le composant écoute pour recevoir les nouveaux messages
  messages$ = this.messageSubject.asObservable();

  connect(chatSessionId: number, token: string | null): void {
    this.client = new Client({
      // SockJS comme transport (même config que le backend)
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),

      // Si l'utilisateur est connecté, on envoie le JWT dans le header CONNECT
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

      reconnectDelay: 5000,

      onConnect: () => {
        // S'abonner au canal de cette session spécifique
        this.client.subscribe(
          `/topic/chat/${chatSessionId}`,
          (frame: IMessage) => {
            const message: ChatMessage = JSON.parse(frame.body);
            this.messageSubject.next(message);
          }
        );
      },

      onStompError: (frame) => {
        console.error('[WebSocket] Erreur STOMP :', frame.headers['message']);
      }
    });

    this.client.activate();
  }

  // Envoyer un message — nécessite d'être connecté (principal != null côté backend)
  sendMessage(chatSessionId: number, content: string): void {
    if (!this.client?.connected) return;

    this.client.publish({
      destination: `/app/chat/${chatSessionId}/send`,
      body: JSON.stringify({ content })
    });
  }

  disconnect(): void {
    if (this.client?.active) {
      this.client.deactivate();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}