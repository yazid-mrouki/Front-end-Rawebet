import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSessionService } from '../../../features/chat/services/chat-session.service';
import { ChatSession } from '../../../features/chat/models/chat-session.model';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-chat.component.html'
})
export class AdminChatComponent implements OnInit {

  sessions: ChatSession[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  showRestartModal = false;
  restartSessionId: number | null = null;
  restartName = '';
  restartDuration = 120;

  constructor(private chatService: ChatSessionService) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    this.chatService.getAllSessions().subscribe({
      next: (sessions: ChatSession[]) => {
        this.sessions = sessions.sort((a: ChatSession, b: ChatSession) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les sessions.';
        this.loading = false;
      }
    });
  }

  // ✅ Helper pour éviter les problèmes de type 0/1 vs false/true venant de MySQL
  isActive(session: ChatSession): boolean {
    return session.active === true || (session.active as any) === 1;
  }

  closeSession(sessionId: number): void {
    this.chatService.closeSession(sessionId).subscribe({
      next: () => {
        this.showSuccess('Session fermée avec succès.');
        this.loadSessions();
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la fermeture.';
      }
    });
  }

  openRestartModal(session: ChatSession): void {
    this.restartName = session.name;
    this.restartSessionId = session.seanceId;
    this.restartDuration = 120;
    this.showRestartModal = true;
  }

  confirmRestart(): void {
    if (!this.restartSessionId || !this.restartName.trim()) return;

    this.chatService.restartSession(
      this.restartSessionId,
      this.restartName.trim(),
      this.restartDuration
    ).subscribe({
      next: () => {
        this.showRestartModal = false;
        this.showSuccess('Session relancée avec succès.');
        this.loadSessions();
      },
      error: () => {
        this.errorMessage = 'Erreur lors du relancement.';
      }
    });
  }

  getTimeRemaining(endTime: string): string {
    const now = new Date();
    const end = new Date(endTime);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expirée';
    const diffMin = Math.floor(diffMs / 60000);
    const diffSec = Math.floor((diffMs % 60000) / 1000);
    return `${diffMin}m ${diffSec}s`;
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3000);
  }
}