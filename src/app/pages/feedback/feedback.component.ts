import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent {
  feedbackForm = { event: '', rating: 5, comment: '' };

  myFeedback = [
    { event: 'Film Festival Night', rating: 5, comment: 'Amazing experience! The atmosphere was incredible.', date: 'Mar 20, 2026', status: 'Published' },
    { event: 'Comedy Show', rating: 4, comment: 'Great lineup, but the sound could have been better.', date: 'Mar 10, 2026', status: 'Published' },
    { event: 'Art Exhibition', rating: 5, comment: 'Stunning artworks and wonderful curation. Will come again!', date: 'Feb 28, 2026', status: 'Under Review' }
  ];

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - rating).fill(0);
  }

  submitFeedback() {
    console.log('Feedback submitted:', this.feedbackForm);
  }
}
