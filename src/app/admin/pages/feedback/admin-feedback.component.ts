import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-feedback.component.html'
})
export class AdminFeedbackComponent {
  overallRating = 4.3;
  totalFeedback = 284;

  feedbacks = [
    { id: 1, user: 'Ahmed Ben Ali', event: 'Champions League Watch Party', rating: 5, comment: 'Amazing atmosphere! Best watch party ever.', date: '2025-05-28', read: true },
    { id: 2, user: 'Fatma Saidi', event: 'Indie Film Festival', rating: 4, comment: 'Great selection of films. Could improve seating.', date: '2025-05-27', read: true },
    { id: 3, user: 'Sami Trabelsi', event: 'Acting Masterclass', rating: 5, comment: 'Hiam Abbas was incredible. Learned so much!', date: '2025-05-26', read: false },
    { id: 4, user: 'Nour Hamdi', event: 'Comedy Night', rating: 3, comment: 'Good show but too crowded. Ventilation needs improvement.', date: '2025-05-25', read: false },
    { id: 5, user: 'Youssef Karim', event: 'Photography Exhibition', rating: 4, comment: 'Beautiful works. Would love more exhibitions like this.', date: '2025-05-24', read: true },
    { id: 6, user: 'Leila Bouzid', event: 'Music Evening', rating: 5, comment: 'Malouf was magical. Perfect evening.', date: '2025-05-23', read: false },
  ];

  getStars(rating: number): string { return '⭐'.repeat(rating) + '☆'.repeat(5 - rating); }
  markRead(id: number) { const f = this.feedbacks.find(fb => fb.id === id); if (f) f.read = true; }
  get unreadCount() { return this.feedbacks.filter(f => !f.read).length; }
}
