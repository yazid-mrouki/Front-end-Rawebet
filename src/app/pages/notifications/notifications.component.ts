import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html'
})
export class NotificationsComponent {
  notifications = [
    { id: 1, title: 'New Event: Champions League Final', message: 'The watch party for the UCL Final is now open for booking!', time: '2 hours ago', read: false, type: 'event', emoji: '⚽' },
    { id: 2, title: 'Ticket Confirmed', message: 'Your ticket for the Indie Film Festival has been confirmed.', time: '5 hours ago', read: false, type: 'ticket', emoji: '🎟️' },
    { id: 3, title: 'Loyalty Points Earned', message: 'You earned 50 points for attending the Comedy Night.', time: '1 day ago', read: false, type: 'loyalty', emoji: '⭐' },
    { id: 4, title: 'Club Session Reminder', message: 'Cinema Club meeting tomorrow at 3:00 PM.', time: '1 day ago', read: true, type: 'club', emoji: '📅' },
    { id: 5, title: 'New Film Added', message: '"The Last Horizon" is now showing. Book your tickets!', time: '2 days ago', read: true, type: 'film', emoji: '🎬' },
    { id: 6, title: 'Subscription Renewed', message: 'Your Culture Pass subscription has been renewed for April.', time: '3 days ago', read: true, type: 'subscription', emoji: '💳' }
  ];

  markAsRead(id: number) {
    const n = this.notifications.find(n => n.id === id);
    if (n) n.read = true;
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
  }

  get unreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }
}
