import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClubJoinRequestService } from '../../services/club-join-request.service';

@Component({
  selector: 'app-club-join',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './club-join.component.html',
  styleUrls: ['./club-join.component.scss']
})
export class ClubJoinComponent {

  motivation = '';
  success = false;
  error: string | null = null;
  loading = false;

  constructor(private joinService: ClubJoinRequestService) {}

  submit(): void {
    if (!this.motivation.trim()) return;

    this.loading = true;
    this.error = null;

    this.joinService.submitRequest({ motivation: this.motivation }).subscribe({
      next: () => {
        this.success = true;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Request failed. Please try again.';
        this.loading = false;
      }
    });
  }
}