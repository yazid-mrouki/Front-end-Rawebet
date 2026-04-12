import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClubJoinRequestService } from '../../services/club-join-request.service';
import { ClubJoinRequest } from '../../models/club-join-request.model';
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

  // ✅ CL1 — Stocke la demande complète au lieu d'un simple boolean
  myRequest: ClubJoinRequest | null = null;
  requestLoaded = false;

  constructor(private joinRequestService: ClubJoinRequestService) {}

  ngOnInit(): void {
    this.joinRequestService.getMyRequest().subscribe({
      next: (req) => {
        this.myRequest = req;
        this.requestLoaded = true;
      },
      error: () => {
        // 404 → aucune demande existante, afficher le formulaire
        this.myRequest = null;
        this.requestLoaded = true;
      }
    });
  }

  // ✅ CL1 — Getters pour les différents états
  get isPending(): boolean { return this.myRequest?.status === 'PENDING'; }
  get isApproved(): boolean { return this.myRequest?.status === 'APPROVED'; }
  get isRejected(): boolean { return this.myRequest?.status === 'REJECTED'; }
  get showForm(): boolean { return this.requestLoaded && !this.success && !this.myRequest; }

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
