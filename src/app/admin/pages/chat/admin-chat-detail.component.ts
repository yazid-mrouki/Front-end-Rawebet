import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChatSessionService } from '../../../features/chat/services/chat-session.service';
import { ChatSession } from '../../../features/chat/models/chat-session.model';
import { ChatMessage } from '../../../features/chat/models/chat-message.model';

@Component({
  selector: 'app-admin-chat-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-chat-detail.component.html'
})
export class AdminChatDetailComponent implements OnInit {

  session: ChatSession | null = null;
  messages: ChatMessage[] = [];
  loading = true;
  loadingMore = false;
  errorMessage = '';
  successMessage = '';

  currentPage = 0;
  hasMore = false;
  totalElements = 0;

  // Context menu
  openMenuId: number | null = null;

  // Delete confirmation modal
  showDeleteModal = false;
  messageToDelete: ChatMessage | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadSession(id);
    this.loadMessages(id, 0);
  }

  loadSession(id: number): void {
    this.chatService.getAllSessions().subscribe({
      next: (sessions) => {
        this.session = sessions.find(s => s.id === id) || null;
        this.cdr.detectChanges();
      }
    });
  }

  loadMessages(sessionId: number, page: number): void {
    if (page === 0) this.loading = true;
    else this.loadingMore = true;

    this.chatService.getMessages(sessionId, page, 50).subscribe({
      next: (data) => {
        if (page === 0) {
          this.messages = data.messages;
        } else {
          // "Load more" prepends older messages at the top
          this.messages = [...data.messages, ...this.messages];
        }
        this.currentPage = data.page;
        this.hasMore = data.hasMore;
        this.totalElements = data.totalElements;
        this.loading = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load messages.';
        this.loading = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMore(): void {
    if (!this.session || this.loadingMore) return;
    this.loadMessages(this.session.id, this.currentPage + 1);
  }

  toggleMenu(messageId: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === messageId ? null : messageId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  openDeleteModal(msg: ChatMessage, event: Event): void {
    event.stopPropagation();
    this.openMenuId = null;
    this.messageToDelete = msg;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.messageToDelete = null;
  }

  confirmDelete(): void {
    if (!this.messageToDelete) return;
    const messageId = this.messageToDelete.id;
    this.showDeleteModal = false;
    this.messageToDelete = null;

    this.chatService.adminDeleteMessage(messageId).subscribe({
      next: () => {
        const msg = this.messages.find(m => m.id === messageId);
        if (msg) {
          msg.deleted = true;
          msg.content = '';
        }
        this.showSuccess('Message deleted successfully.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Error while deleting message.';
        this.cdr.detectChanges();
      }
    });
  }

  isActive(session: ChatSession): boolean {
    const activeFlag = session.active === true || (session.active as any) === 1;
    if (!activeFlag) return false;
    return new Date(session.endTime).getTime() > Date.now();
  }

  goBack(): void {
    this.router.navigate(['/admin/chat']);
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }
}