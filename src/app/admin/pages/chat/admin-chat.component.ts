import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatSessionService } from '../../../features/chat/services/chat-session.service';
import { ChatSession } from '../../../features/chat/models/chat-session.model';

@Component({
  selector: 'app-admin-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-chat.component.html'
})
export class AdminChatComponent implements OnInit, OnDestroy {

  sessions: ChatSession[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  showRestartModal = false;
  restartSessionId: number | null = null;
  restartName = '';
  restartDuration = 120;

  private timerInterval: any;

  constructor(
    private chatService: ChatSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    // ✅ BUG 3 FIXED: timer that refreshes every second
    this.timerInterval = setInterval(() => {
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    // ✅ Timer cleanup to avoid memory leaks
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadSessions(): void {
    this.loading = true;
    this.chatService.getAllSessions().subscribe({
      next: (sessions: ChatSession[]) => {
        // ✅ BUG 2 FIXED: robust sort when createdAt is null (static SQL data)
        this.sessions = sessions.sort((a: ChatSession, b: ChatSession) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load sessions.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ✅ BUG 1 FIXED: also checks endTime locally, not just the active flag
  isActive(session: ChatSession): boolean {
    const activeFlag = session.active === true || (session.active as any) === 1;
    if (!activeFlag) return false;
    return new Date(session.endTime).getTime() > Date.now();
  }

  closeSession(sessionId: number): void {
    this.chatService.closeSession(sessionId).subscribe({
      next: () => {
        this.showSuccess('Session closed successfully.');
        this.loadSessions();
      },
      error: () => {
        this.errorMessage = 'Error while closing session.';
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
        this.showSuccess('Session restarted successfully.');
        this.loadSessions();
      },
      error: () => {
        this.errorMessage = 'Error while restarting session.';
      }
    });
  }

  getTimeRemaining(endTime: string): string {
    const now = new Date();
    const end = new Date(endTime);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
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