import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timeout } from 'rxjs';

import { SubscriptionService } from '../../../core/services/subscription.service';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-subscriptions.component.html',
  styleUrls: ['./admin-subscriptions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSubscriptionsComponent implements OnInit, OnDestroy {
  subscriptions: any[] = [];
  loading = true;
  deleting: Set<number> = new Set();
  error: string | null = null;
  private subs = new Subscription();
  private loadTimeout: any;

  constructor(
    private subscriptionService: SubscriptionService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUserSubscriptions();
  }

  loadUserSubscriptions() {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    // Set timeout to show error if loading takes too long
    this.loadTimeout = setTimeout(() => {
      if (this.loading) {
        this.error = 'Loading is taking longer than expected. Please try again.';
        this.loading = false;
        this.toastService.show('Loading timeout - please refresh the page', 'error');
        this.cdr.markForCheck();
      }
    }, 10000); // 10 second timeout

    const sub = this.subscriptionService.getAbonnements()
      .pipe(
        timeout(8000) // 8 second HTTP timeout
      )
      .subscribe({
        next: (data) => {
          clearTimeout(this.loadTimeout);
          this.subscriptions = data || [];
          this.error = null;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          clearTimeout(this.loadTimeout);
          this.error = err.name === 'TimeoutError'
            ? 'Request timed out. Server might be slow.'
            : 'Failed to load user subscriptions';
          this.toastService.show(this.error, 'error');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });

    this.subs.add(sub);
  }

  deleteSubscription(subscriptionId: number) {
    if (confirm('Are you sure you want to delete this user subscription?')) {
      this.deleting.add(subscriptionId);
      this.cdr.markForCheck();

      const sub = this.subscriptionService.deleteUserAbonnement(subscriptionId)
        .pipe(timeout(5000))
        .subscribe({
          next: () => {
            this.subscriptions = this.subscriptions.filter(s => s.subscriptionId !== subscriptionId);
            this.deleting.delete(subscriptionId);
            this.toastService.show('User subscription deleted successfully', 'success');
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.deleting.delete(subscriptionId);
            const errorMsg = err.name === 'TimeoutError'
              ? 'Delete request timed out'
              : 'Failed to delete user subscription';
            this.toastService.show(errorMsg, 'error');
            this.cdr.markForCheck();
          }
        });
      this.subs.add(sub);
    }
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE':
        return 'status-active';
      case 'QUEUED':
        return 'status-queued';
      case 'EXPIRED':
        return 'status-expired';
      default:
        return 'status-default';
    }
  }

  ngOnDestroy() {
    clearTimeout(this.loadTimeout);
    this.subs.unsubscribe();
  }
}
