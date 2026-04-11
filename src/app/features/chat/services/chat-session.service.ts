import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatSession } from '../models/chat-session.model';
import { ChatMessage } from '../models/chat-message.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatSessionService {

  private apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  // ── PUBLIC ──────────────────────────────────────────────────────────────

  // Rejoindre une session via le code 4 chiffres affiché dans la salle
  joinByCode(code: string): Observable<ChatSession> {
    return this.http.get<ChatSession>(`${this.apiUrl}/join/${code}`);
  }

  // Vérifier si la session est encore active
  isActive(code: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/active/${code}`);
  }

  // Charger l'historique des messages (public, sans token)
  getMessages(chatSessionId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/messages/${chatSessionId}`);
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────

  // Lister toutes les sessions
  getAllSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.apiUrl}/sessions`);
  }

  // Fermer manuellement une session
  closeSession(sessionId: number): Observable<ChatSession> {
    return this.http.put<ChatSession>(`${this.apiUrl}/session/${sessionId}/close`, null);
  }

  // Relancer manuellement une session
  restartSession(seanceId: number, name: string, durationMinutes: number): Observable<ChatSession> {
    return this.http.post<ChatSession>(
      `${this.apiUrl}/session/${seanceId}/restart`,
      null,
      { params: { name, durationMinutes: durationMinutes.toString() } }
    );
  }
}