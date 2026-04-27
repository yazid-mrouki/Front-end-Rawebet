import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: number;
  message: string;
  dateEnvoi: string;
  type: string;
  lue: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private api = environment.apiUrl;

  // Use BehaviorSubject for unread count - this will emit the current value to new subscribers
  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {}

  // Get all notifications for a user
  getNotificationsByUserId(userId: number) {
    return this.http.get<Notification[]>(`${this.api}/api/notifications/user/${userId}`);
  }

  // Get unread count for a user
  getUnreadCount(userId: number) {
    return this.http.get<any>(`${this.api}/api/notifications/unread/user/${userId}`);
  }

  // Mark a single notification as read
  markAsRead(notificationId: number) {
    return this.http.put<any>(`${this.api}/api/notifications/read/${notificationId}`, {});
  }

  // Mark all notifications as read for a user
  markAllAsRead(userId: number) {
    return this.http.put<any>(`${this.api}/api/notifications/read/user/${userId}`, {});
  }

  // Delete a notification
  deleteNotification(notificationId: number) {
    return this.http.delete(`${this.api}/api/notifications/${notificationId}`);
  }

  // Get all notifications (admin)
  getAllNotifications() {
    return this.http.get<Notification[]>(`${this.api}/api/notifications/all`);
  }

  // Delete all notifications
  deleteAllNotifications() {
    return this.http.delete<{ success: boolean }>(`${this.api}/api/notifications/delete/all`);
  }

  // Update unread count
  setUnreadCount(count: number) {
    console.log('📊 Setting unread count to:', count);
    this.unreadCount$.next(count);
  }

  // Decrement unread count
  decrementUnreadCount() {
    const current = this.unreadCount$.getValue();
    if (current > 0) {
      const newCount = current - 1;
      console.log(`⬇️ Decrementing unread count from ${current} to ${newCount}`);
      this.unreadCount$.next(newCount);
    }
  }

  // Reset unread count
  resetUnreadCount() {
    console.log('🗑️ Resetting unread count to 0');
    this.unreadCount$.next(0);
  }

  // Get current unread count value
  getCurrentUnreadCount(): number {
    return this.unreadCount$.getValue();
  }
}
