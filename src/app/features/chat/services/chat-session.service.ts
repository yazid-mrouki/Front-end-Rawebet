import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatSession } from '../models/chat-session.model';
import { ChatMessage, MessagePage, SessionReactions } from '../models/chat-message.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatSessionService {

  private apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  // ── PUBLIC ──────────────────────────────────────────────────────────────

  joinByCode(code: string): Observable<ChatSession> {
    return this.http.get<ChatSession>(`${this.apiUrl}/join/${code}`);
  }

  isActive(code: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/active/${code}`);
  }

  getMessages(chatSessionId: number, page = 0, size = 20): Observable<MessagePage> {
    return this.http.get<MessagePage>(
      `${this.apiUrl}/messages/${chatSessionId}`,
      { params: { page: page.toString(), size: size.toString() } }
    );
  }

  // Charge counts + users de toutes les réactions d'une session
  getReactions(chatSessionId: number): Observable<Record<number, SessionReactions>> {
    return this.http.get<Record<number, SessionReactions>>(
      `${this.apiUrl}/reactions/${chatSessionId}`
    );
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────

  getAllSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.apiUrl}/sessions`);
  }

  closeSession(sessionId: number): Observable<ChatSession> {
    return this.http.put<ChatSession>(`${this.apiUrl}/session/${sessionId}/close`, null);
  }

  restartSession(seanceId: number, name: string, durationMinutes: number): Observable<ChatSession> {
    return this.http.post<ChatSession>(
      `${this.apiUrl}/session/${seanceId}/restart`,
      null,
      { params: { name, durationMinutes: durationMinutes.toString() } }
    );
  }

  // Soft delete admin — met deleted = true en base, invisible pour tous les users
  adminDeleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/messages/${messageId}/admin`);
  }
}