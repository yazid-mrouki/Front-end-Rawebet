import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService, Notification } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {

  notifications: Notification[] = [];
  loading = false;
  loadingNotifications = false;

  // ================= MODAL =================
  selectedNotification: Notification | null = null;
  showModal = false;

  // ================= CONTEXT MENU =================
  contextMenu = {
    show: false,
    x: 0,
    y: 0,
    notificationId: null as number | null
  };

  userId: number | null = null;
  unreadCount = 0;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initUser();
  }

  // ================= USER INIT =================
  initUser() {
    this.userId = this.authService.getUserId();

    if (!this.userId) {
      const token = this.authService.getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userId = payload.userId || payload.id || payload.sub;
          if (this.userId) {
            localStorage.setItem('userId', this.userId.toString());
          }
        } catch (e) {
          console.error('Token error', e);
        }
      }
    }

    if (this.userId) {
      this.loadNotifications();
      this.loadUnreadCount();
    }
  }

  // ================= NOTIFICATIONS =================
  loadNotifications() {
    if (!this.userId) return;

    this.loadingNotifications = true;

    this.notificationService.getNotificationsByUserId(this.userId)
      .subscribe({
        next: (data) => {
          // Sort by date - newest first
          this.notifications = data.sort((a, b) => {
            const dateA = new Date(a.dateEnvoi).getTime();
            const dateB = new Date(b.dateEnvoi).getTime();
            return dateB - dateA;
          });
          this.calculateUnreadCount();
          this.loadingNotifications = false;
          this.cd.markForCheck();
        },
        error: (err) => {
          this.loadingNotifications = false;
          this.cd.markForCheck();
        }
      });
  }

  loadUnreadCount() {
    if (!this.userId) return;

    this.notificationService.getUnreadCount(this.userId)
      .subscribe({
        next: (res) => {
          this.unreadCount = res.count || 0;
          this.cd.markForCheck();
        },
        error: (err) => {
          // Silently fail
        }
      });
  }

  calculateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.lue).length;
  }

  // ================= MODAL =================
  openModal(notif: Notification) {
    this.selectedNotification = notif;
    this.showModal = true;

    // Mark as read when modal opens
    if (!notif.lue) {
      this.markAsRead(notif.id);
    }

    this.cd.markForCheck();
  }

  closeModal() {
    this.showModal = false;
    this.selectedNotification = null;
    this.cd.markForCheck();
  }

  // Prevent body scroll when modal is open
  @HostListener('window:scroll')
  onScroll() {
    if (this.showModal) {
      window.scrollTo(0, 0);
    }
  }

  // ================= CONTEXT MENU =================
  onRightClick(event: MouseEvent, notif: Notification) {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenu.show = true;
    this.contextMenu.x = event.pageX;
    this.contextMenu.y = event.pageY;
    this.contextMenu.notificationId = notif.id;

    this.cd.markForCheck();
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenu.show = false;
    this.cd.markForCheck();
  }

  // ================= ACTIONS =================
  markAsRead(id: number) {
    if (!id) return;

    console.log('📌 Marking as read:', id);
    this.notificationService.markAsRead(id)
      .subscribe({
        next: (res) => {
          const notif = this.notifications.find(n => n.id === id);
          if (notif) {
            notif.lue = true;
            this.calculateUnreadCount();
            // Decrement unread count in navbar via service
            this.notificationService.decrementUnreadCount();
            console.log('✅ Notification marked as read and count decremented:', id);
            this.cd.markForCheck();
          }
        },
        error: (err) => {
          console.error('❌ Error marking as read:', err);
          this.cd.markForCheck();
        }
      });
  }

  markAllAsRead() {
    if (!this.userId) return;

    this.loading = true;

    this.notificationService.markAllAsRead(this.userId)
      .subscribe({
        next: (res) => {
          this.notifications.forEach(n => n.lue = true);
          this.unreadCount = 0;
          this.loading = false;
          // Reset unread count in navbar via service
          this.notificationService.resetUnreadCount();
          console.log('✅ All notifications marked as read and count reset');
          this.cd.markForCheck();
        },
        error: (err) => {
          console.error('Error marking all as read:', err);
          this.loading = false;
          this.cd.markForCheck();
        }
      });
  }

  deleteNotification(id: number) {
    if (!id) return;

    this.notificationService.deleteNotification(id)
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n.id !== id);
          this.calculateUnreadCount();
          this.contextMenu.show = false;
          this.cd.markForCheck();
        },
        error: (err) => console.error('Error deleting notification:', err)
      });
  }

  // ================= HELPERS =================
  getNotificationTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'EMAIL': '📧',
      'PUSH': '🔔',
      'SYSTEM': '⚙️',
      'ALERT': '⚠️',
      'SUCCESS': '✅',
      'INFO': 'ℹ️'
    };
    return icons[type] || '📧';
  }

  getNotificationTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'EMAIL': 'blue',
      'PUSH': 'red',
      'SYSTEM': 'gray',
      'ALERT': 'yellow',
      'SUCCESS': 'green',
      'INFO': 'indigo'
    };
    return colors[type] || 'gray';
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  }
}
