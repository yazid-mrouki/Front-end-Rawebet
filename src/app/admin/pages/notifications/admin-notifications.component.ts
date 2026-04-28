import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService, Notification } from '../../../core/services/notification.service';

type TargetType = 'all' | 'subscriber' | 'user';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-notifications.component.css']
})
export class AdminNotificationsComponent implements OnInit {

  newTitle = '';
  newMessage = '';

  newTargetType: TargetType = 'all';
  selectedUser: number | null = null;

  users: any[] = [];
  allNotifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  notificationTypes: string[] = [];

  // Filters
  searchQuery = '';
  filterType = '';
  filterStatus = 'all'; // all, read, unread

  loading = false;
  deleting: { [key: number]: boolean } = {};

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private notificationService: NotificationService,
    private cd: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    console.log('🔄 Admin Notifications Init');
    this.loadUsers();
    this.loadAllNotifications();
  }

  private getHeaders() {
    if (!isPlatformBrowser(this.platformId)) return new HttpHeaders();

    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  loadUsers() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http.get<any[]>(
      `${environment.apiUrl}/api/notifications/users/role5`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.users = data;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error loading users:', err);
        this.toast.show('Erreur chargement users', 'error');
      }
    });
  }

  // Load all notifications for admin
  loadAllNotifications() {
    console.log('📥 Loading all notifications...');
    this.loading = true;
    this.cd.markForCheck();

    this.notificationService.getAllNotifications().subscribe({
      next: (data) => {
        console.log('✅ Loaded:', data.length, 'notifications');

        // Sort by date
        this.allNotifications = data.sort((a, b) => {
          return new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime();
        });

        // Extract unique types
        this.notificationTypes = [...new Set(this.allNotifications.map(n => n.type))].sort();

        // Apply filters
        this.applyFilters();

        this.loading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error loading notifications:', err);
        this.toast.show('Erreur chargement notifications', 'error');
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  // Apply filters - OPTIMIZED
  applyFilters() {
    console.log('🔍 Applying filters...');
    const start = performance.now();

    this.filteredNotifications = this.allNotifications.filter(notif => {
      // Search filter
      const matchesSearch = this.searchQuery === '' ||
        notif.message.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        notif.type.toLowerCase().includes(this.searchQuery.toLowerCase());

      // Type filter
      const matchesType = this.filterType === '' || notif.type === this.filterType;

      // Status filter
      let matchesStatus = true;
      if (this.filterStatus === 'read') matchesStatus = notif.lue;
      else if (this.filterStatus === 'unread') matchesStatus = !notif.lue;

      return matchesSearch && matchesType && matchesStatus;
    });

    const end = performance.now();
    console.log(`✅ Filtered to ${this.filteredNotifications.length} results (${(end - start).toFixed(2)}ms)`);
    this.cd.markForCheck();
  }

  // Delete notification
  deleteNotification(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification?')) return;

    this.deleting[id] = true;
    this.cd.markForCheck();

    this.notificationService.deleteNotification(id).subscribe({
      next: () => {
        console.log('🗑️ Deleted notification:', id);
        this.allNotifications = this.allNotifications.filter(n => n.id !== id);
        this.applyFilters();
        this.toast.show('Notification supprimée', 'success');
        delete this.deleting[id];
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error deleting notification:', err);
        this.toast.show('Erreur suppression', 'error');
        delete this.deleting[id];
        this.cd.markForCheck();
      }
    });
  }

  // Delete ALL notifications
  deleteAllNotifications() {
    if (!confirm('⚠️ ATTENTION: Supprimer TOUTES les notifications? Cette action ne peut pas être annulée!')) return;

    this.loading = true;
    this.cd.markForCheck();

    this.notificationService.deleteAllNotifications().subscribe({
      next: () => {
        console.log('🗑️ All notifications deleted!');
        this.allNotifications = [];
        this.filteredNotifications = [];
        this.notificationTypes = [];
        this.toast.show('✅ Toutes les notifications ont été supprimées', 'success');
        // Reset unread count in navbar
        this.notificationService.resetUnreadCount();
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error deleting all notifications:', err);
        this.toast.show('Erreur suppression totale', 'error');
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  // Format date
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

  private resetForm() {
    this.newMessage = '';
    this.newTargetType = 'all';
    this.selectedUser = null;
  }

  sendNotification() {
    const headers = this.getHeaders();

    let url = '';
    let params: any = {};

    if (this.newTargetType === 'all') {
      url = `${environment.apiUrl}/api/notifications/pushnotiftoallusers`;
      params = { message: this.newMessage };
    }

    else if (this.newTargetType === 'subscriber') {
      url = `${environment.apiUrl}/api/notifications/pushnotiftoonlysubscriber`;
      params = { message: this.newMessage };
    }

    else if (this.newTargetType === 'user') {

      if (!this.selectedUser) {
        this.toast.show('Sélectionne un utilisateur', 'error');
        return;
      }

      url = `${environment.apiUrl}/api/notifications/push`;
      params = {
        userId: this.selectedUser,
        message: this.newMessage
      };
    }

    this.http.post(url, null, { params, headers }).subscribe({
      next: () => {
        this.toast.show('Notification envoyée avec succès', 'success');
        this.resetForm();
        this.loadAllNotifications(); // Reload list
        this.cd.markForCheck();
      },
      error: () => {
        this.toast.show('Erreur envoi notification', 'error');
        this.cd.markForCheck();
      }
    });
  }

  sendEmail() {
    const headers = this.getHeaders();

    let url = '';
    let params: any = {};

    if (this.newTargetType === 'all') {
      url = `${environment.apiUrl}/api/notifications/sendemailtoallusers`;
      params = { message: this.newMessage };
    }

    else if (this.newTargetType === 'subscriber') {
      url = `${environment.apiUrl}/api/notifications/sendemailtoonlysubscriber`;
      params = { message: this.newMessage };
    }

    else if (this.newTargetType === 'user') {
      if (!this.selectedUser) {
        this.toast.show('Choisir un utilisateur', 'error');
        return;
      }

      url = `${environment.apiUrl}/api/notifications/email`;
      params = {
        userId: this.selectedUser,
        message: this.newMessage
      };
    }

    this.http.post(url, null, { params, headers }).subscribe({
      next: () => {
        this.toast.show('Email envoyé avec succès', 'success');
        this.resetForm();
        this.loadAllNotifications(); // Reload list
        this.cd.markForCheck();
      },
      error: () => {
        this.toast.show('Erreur email', 'error');
        this.cd.markForCheck();
      }
    });
  }
}
