import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.component.html'
})
export class AdminNotificationsComponent {
  newTitle = '';
  newMessage = '';
  newTarget = 'all';

  sentNotifications = [
    { id: 1, title: 'Champions League Watch Party Tonight!', message: 'Don\'t miss the final at 8PM. Doors open at 7PM.', target: 'All Users', sent: '2025-05-31 14:00', read: 8540 },
    { id: 2, title: 'New Film Added: Desert Wind', message: 'A brand new adventure film is now showing at Rawebet.', target: 'Subscribers', sent: '2025-05-28 10:00', read: 2890 },
    { id: 3, title: 'Workshop Spots Available', message: 'Acting Masterclass with Hiam Abbas still has spots. Register now!', target: 'All Users', sent: '2025-05-25 09:00', read: 5200 },
    { id: 4, title: 'Loyalty Tier Update', message: 'Check your loyalty dashboard for updated tier benefits!', target: 'Loyalty Members', sent: '2025-05-20 16:00', read: 3100 },
  ];

  sendNotification() {
    if (this.newTitle && this.newMessage) {
      this.sentNotifications.unshift({
        id: Date.now(),
        title: this.newTitle,
        message: this.newMessage,
        target: this.newTarget === 'all' ? 'All Users' : this.newTarget === 'subs' ? 'Subscribers' : 'Loyalty Members',
        sent: new Date().toISOString().slice(0, 16).replace('T', ' '),
        read: 0
      });
      this.newTitle = '';
      this.newMessage = '';
      this.newTarget = 'all';
    }
  }
}
