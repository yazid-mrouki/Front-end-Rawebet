import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClubJoinRequestService } from '../../services/club-join-request.service';
import { ClubNavComponent } from '../../components/club-nav/club-nav.component';

@Component({
  selector: 'app-club-join',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClubNavComponent],
  templateUrl: './club-join.component.html',
  styleUrls: ['./club-join.component.scss']
})
export class ClubJoinComponent implements OnInit {

  motivation = '';
  loading = false;
  success = false;
  error: string | null = null;

  /** true si une demande est déjà en cours (PENDING) */
  alreadyPending = false;

  constructor(private joinRequestService: ClubJoinRequestService) {}

  ngOnInit(): void {
    // Vérifie si l'utilisateur a déjà une demande en attente
    this.joinRequestService.getMyRequest().subscribe({
      next: (req) => {
        if (req && req.status === 'PENDING') {
          this.alreadyPending = true;
        }
      },
      error: () => {
        // Pas de demande existante — état normal
      }
    });
  }

  submit(): void {
    if (!this.motivation.trim() || this.loading) return;
    this.loading = true;
    this.error = null;

    this.joinRequestService.submitRequest({ motivation: this.motivation }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to submit request. Please try again.';
        this.loading = false;
      }
    });
  }
}