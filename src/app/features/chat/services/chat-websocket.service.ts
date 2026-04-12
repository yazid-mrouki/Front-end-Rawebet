import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatMessage, ReactionEvent, UnsendEvent } from '../models/chat-message.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {

  private client!: Client;
  private messageSubject   = new Subject<ChatMessage>();
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private typingSubject    = new Subject<string>();
  private reactionSubject  = new Subject<ReactionEvent>();
  private unsendSubject    = new Subject<UnsendEvent>();
  private editSubject      = new Subject<ChatMessage>();

  private connectionId = 0;

  messages$  = this.messageSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();
  typing$    = this.typingSubject.asObservable();
  reaction$  = this.reactionSubject.asObservable();
  unsend$    = this.unsendSubject.asObservable();
  edit$      = this.editSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(chatSessionId: number, token: string | null): void {
    const id = ++this.connectionId;

    if (this.client?.active) this.client.deactivate();
    this.ngZone.run(() => this.connectedSubject.next(false));

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,

      onConnect: () => {
        if (this.connectionId !== id) return;

        this.client.subscribe(`/topic/chat/${chatSessionId}`, (frame: IMessage) => {
          if (this.connectionId !== id) return;
          this.ngZone.run(() => this.messageSubject.next(JSON.parse(frame.body)));
        });

        this.client.subscribe(`/topic/chat/${chatSessionId}/typing`, (frame: IMessage) => {
          if (this.connectionId !== id) return;
          const event: { username: string } = JSON.parse(frame.body);
          this.ngZone.run(() => this.typingSubject.next(event.username));
        });

        this.client.subscribe(`/topic/chat/${chatSessionId}/reactions`, (frame: IMessage) => {
          if (this.connectionId !== id) return;
          this.ngZone.run(() => this.reactionSubject.next(JSON.parse(frame.body)));
        });

        this.client.subscribe(`/topic/chat/${chatSessionId}/unsend`, (frame: IMessage) => {
          if (this.connectionId !== id) return;
          this.ngZone.run(() => this.unsendSubject.next(JSON.parse(frame.body)));
        });

        this.client.subscribe(`/topic/chat/${chatSessionId}/edit`, (frame: IMessage) => {
          if (this.connectionId !== id) return;
          this.ngZone.run(() => this.editSubject.next(JSON.parse(frame.body)));
        });

        this.ngZone.run(() => this.connectedSubject.next(true));
      },

      onDisconnect:    () => { if (this.connectionId !== id) return; this.ngZone.run(() => this.connectedSubject.next(false)); },
      onStompError:    (f) => { if (this.connectionId !== id) return; console.error('[WS] STOMP error', f); this.ngZone.run(() => this.connectedSubject.next(false)); },
      onWebSocketClose:(e) => { if (this.connectionId !== id) return; console.warn('[WS] closed', e);       this.ngZone.run(() => this.connectedSubject.next(false)); },
      onWebSocketError:(e) => { if (this.connectionId !== id) return; console.error('[WS] error', e);       this.ngZone.run(() => this.connectedSubject.next(false)); },
    });

    this.client.activate();
  }

  sendMessage(chatSessionId: number, content: string): boolean {
    if (!this.client?.connected) return false;
    this.client.publish({ destination: `/app/chat/${chatSessionId}/send`, body: JSON.stringify({ content }) });
    return true;
  }

  sendTyping(chatSessionId: number): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/chat/${chatSessionId}/typing`, body: '{}' });
  }

  sendReaction(chatSessionId: number, messageId: number, emoji: string): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/chat/${chatSessionId}/react`, body: JSON.stringify({ messageId, emoji }) });
  }

  sendUnsend(chatSessionId: number, messageId: number, forEveryone: boolean): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/chat/${chatSessionId}/unsend`, body: JSON.stringify({ messageId, forEveryone }) });
  }

  sendEdit(chatSessionId: number, messageId: number, newContent: string): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/chat/${chatSessionId}/edit`, body: JSON.stringify({ messageId, newContent }) });
  }

  disconnect(): void {
    this.connectionId++;
    if (this.client?.active) this.client.deactivate();
    this.ngZone.run(() => this.connectedSubject.next(false));
  }

  ngOnDestroy(): void { this.disconnect(); }
}