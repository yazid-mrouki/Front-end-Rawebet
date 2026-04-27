import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import {
  SubscribeResponse,
  SubscriptionDto,
  TimelineResponse,
  UserAbonnement
} from '../../core/models/subscription.model';
import { RecommendationApiResponse, RecommendationPayload, RecommendationResult } from '../../core/models/recommendation.model';
import { ToastService } from '../../core/services/toast';
import { QrService } from '../../core/services/qr.service';
import { RecommendationService } from '../../core/services/recommendation.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrls: ['./subscriptions.component.css']
})
export class SubscriptionsComponent implements OnInit, OnDestroy {

  userId: number | null = null;

  userAbonnement: UserAbonnement | null = null;
  currentSubscription: UserAbonnement | null = null;
  queuedSubscription: UserAbonnement | null = null;
  queuedSubscriptions: UserAbonnement[] = [];
  historySubscriptions: UserAbonnement[] = [];
  subscribedPlanId: number | null = null;

  loading = false;
  loadingSubscription = false;
  subscriptionReady = false;

  // ✅ QR CODE VARIABLES
  showQRModal = false;
  qrCode: string | null = null;
  qrImage: string | null = null;
  loadingQR = false;
  scanningQR = false;
  scanError: string | null = null;

  showAiModal = false;
  aiLoading = false;
  aiError: string | null = null;
  aiResult: RecommendationResult | null = null;

  recommendationForm = new FormBuilder().nonNullable.group({
    age: [27, [Validators.required, Validators.min(12), Validators.max(100)]],
    budget: [160, [Validators.required, Validators.min(0)]],
    monthly_cinema_visits: [5, [Validators.required, Validators.min(0)]],
    avg_ticket_price: [10.5, [Validators.required, Validators.min(0)]],
    preferred_genre: ['action', [Validators.required]],
    watch_time_pref: ['evening', [Validators.required]],
    group_size: [3, [Validators.required, Validators.min(1)]],
    distance_km: [6, [Validators.required, Validators.min(0)]],
    app_sessions_per_week: [8, [Validators.required, Validators.min(0)]],
    last_booking_days_ago: [9, [Validators.required, Validators.min(0)]],
    promo_sensitivity: [0.6, [Validators.required, Validators.min(0), Validators.max(1)]],
    has_streaming_subscription: ['no', [Validators.required]],
    satisfaction_score: [4.1, [Validators.required, Validators.min(0), Validators.max(5)]],
  });

  private sub?: Subscription;

  plans = [
    { id: 3, name: 'Standard', price: '10', period: '', desc: 'Basic access', features: ['Browse events','2 tickets/month','Feedback system','Notifications'] },
    { id: 2, name: 'Premium', price: '19', period: '/month', desc: 'For regular users', features: ['Unlimited bookings','Discounts','Join clubs','Priority seating'] },
    { id: 1, name: 'VIP', price: '39', period: '/month', desc: 'Ultimate experience', features: ['VIP seating','Exclusive access','Extra points','Concierge'] }
  ];

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private qrService: QrService,
    private recommendationService: RecommendationService,
    private cd: ChangeDetectorRef,
    public toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initUser();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  initUser(): void {
    this.userId = this.authService.getUserId();

    if (!this.userId) {
      const token = this.authService.getToken();

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userId = payload.userId || payload.id || payload.sub;

          if (this.userId) {
            localStorage.setItem('userId', this.userId.toString());
          }
        } catch (e) {
          console.error('Token error', e);
        }
      }
    }

    if (this.userId) {
      this.loadUserSubscription();
    } else {
      // No user ID - mark as ready
      this.subscriptionReady = true;
      this.loadingSubscription = false;
      this.cd.markForCheck();
    }
  }

  loadUserSubscription(): void {
    if (!this.userId) return;

    this.loadingSubscription = true;
    this.subscriptionReady = false;

    this.sub?.unsubscribe();

    this.sub = this.subscriptionService
      .getUserTimeline(this.userId)
      .subscribe({
        next: (timeline) => {
          this.applyTimelineResponse(timeline);

          this.loadingSubscription = false;
          this.subscriptionReady = true;

          this.cd.markForCheck();
        },
        error: (error) => {
          console.error('Error loading subscription timeline:', error);
          this.loadLegacySubscriptionFallback();
        }
      });
  }

  private loadLegacySubscriptionFallback(): void {
    if (!this.userId) {
      return;
    }

    this.sub?.unsubscribe();
    this.sub = this.subscriptionService.getSubscriptionByUserId(this.userId).subscribe({
      next: (sub) => {
        const current = Array.isArray(sub) ? sub[0] ?? null : sub;

        this.userAbonnement = current;
        this.currentSubscription = current && !this.isFutureSubscription(current) ? current : null;
        this.queuedSubscription = current && this.isFutureSubscription(current) ? current : null;
        this.queuedSubscriptions = this.queuedSubscription ? [this.queuedSubscription] : [];
        this.historySubscriptions = [];
        this.subscribedPlanId = this.currentSubscription?.abonnementId ?? current?.abonnementId ?? null;

        this.loadingSubscription = false;
        this.subscriptionReady = true;
        this.cd.markForCheck();
      },
      error: (fallbackError) => {
        console.error('Error loading subscription:', fallbackError);
        this.userAbonnement = null;
        this.currentSubscription = null;
        this.queuedSubscription = null;
        this.queuedSubscriptions = [];
        this.historySubscriptions = [];
        this.subscribedPlanId = null;

        this.loadingSubscription = false;
        this.subscriptionReady = true;
        this.cd.markForCheck();
      }
    });
  }

  subscribe(plan: { id: number; name: string }): void {
    if (!this.userId) return;

    this.loading = true;

    this.subscriptionService.subscribe(this.userId, plan.id)
      .subscribe({
        next: (subscription: SubscribeResponse) => {
          const resultMessage = subscription?.message;

          if (resultMessage) {
            this.toastService.show(resultMessage, 'success');
          } else if (subscription?.resultType === 'QUEUED_NEXT' && subscription?.dateDebut) {
            this.toastService.show(
              `${plan.name} queued successfully. It will start on ${subscription.dateDebut}`,
              'success'
            );
          } else {
            this.toastService.show(`Subscribed to ${plan.name}`, 'success');
          }

          this.loadUserSubscription();

          this.loading = false;
        },
        error: () => {
          this.toastService.show("Subscription failed", 'error');
          this.loading = false;
        }
      });
  }

  getPlanStyle(id: number): string {
    switch (id) {
      case 1: // VIP - Diamond
        return 'plan-vip';
      case 2: // Premium - Gold
        return 'plan-premium';
      default:
        return 'plan-standard';
    }
  }

  private applyTimelineResponse(timeline: TimelineResponse): void {
    this.currentSubscription = this.mapTimelineSubscription(timeline.currentSubscription ?? null);
    this.queuedSubscription = this.mapTimelineSubscription(timeline.nextSubscription ?? null);
    this.queuedSubscriptions = (timeline.queuedSubscriptions ?? [])
      .map((subscription) => this.mapTimelineSubscription(subscription))
      .filter((subscription): subscription is UserAbonnement => !!subscription);
    this.historySubscriptions = (timeline.history ?? [])
      .map((subscription) => this.mapTimelineSubscription(subscription))
      .filter((subscription): subscription is UserAbonnement => !!subscription);
    this.userAbonnement = this.currentSubscription ?? this.queuedSubscription;
    this.subscribedPlanId = this.currentSubscription?.abonnementId ?? null;
  }

  private mapTimelineSubscription(subscription: SubscriptionDto | null): UserAbonnement | null {
    if (!subscription) {
      return null;
    }

    return {
      id: subscription.subscriptionId,
      userAbonnementId: subscription.subscriptionId,
      abonnementId: subscription.abonnementId,
      abonnementName: subscription.abonnementName,
      abonnementType: subscription.abonnementType,
      dateDebut: subscription.dateDebut,
      dateFin: subscription.dateFin,
      ticketsRestants: subscription.ticketsRestants,
      status: subscription.status,
    };
  }

  getShowcaseStyle(id: number | undefined): string {
    switch (id) {
      case 1: // VIP
        return 'showcase-vip';
      case 2: // Premium
        return 'showcase-premium';
      default:
        return 'showcase-standard';
    }
  }

  getShowcaseGradient(id: number | undefined): string {
    switch (id) {
      case 1: // VIP
        return 'bg-gradient-to-br from-cyan-400 to-blue-500';
      case 2: // Premium
        return 'bg-gradient-to-br from-amber-300 to-orange-500';
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  }

  getGlowColorClass(id: number | undefined): string {
    switch (id) {
      case 1: // VIP
        return 'vip-glow';
      case 2: // Premium
        return 'premium-glow';
      default:
        return 'standard-glow';
    }
  }

  getPlanEmoji(id: number | undefined): string {
    switch (id) {
      case 1: // VIP - Diamond
        return '💎';
      case 2: // Premium - Gold
        return '🥇';
      default:
        return '🪙';
    }
  }

  getPlanName(id: number | undefined): string {
    switch (id) {
      case 1:
        return 'VIP';
      case 2:
        return 'Premium';
      default:
        return 'Standard';
    }
  }

  getStatusMessage(): string {
    if (this.currentSubscription && this.queuedSubscription) {
      const currentPlanName = this.getPlanName(this.currentSubscription.abonnementId);
      const nextPlanName = this.getPlanName(this.queuedSubscription.abonnementId);
      const queuedCount = this.getQueuedCount();
      const queuedLabel = queuedCount > 1 ? ` and ${queuedCount - 1} more queued` : '';
      return `You are on ${currentPlanName}. Next: ${nextPlanName} starts on ${this.queuedSubscription.dateDebut}${queuedLabel}`;
    }

    if (this.currentSubscription) {
      const planName = this.getPlanName(this.currentSubscription.abonnementId);
      return `You are currently on the ${planName} plan`;
    }

    if (this.queuedSubscription) {
      const planName = this.getPlanName(this.queuedSubscription.abonnementId);
      return `Your next ${planName} plan starts on ${this.queuedSubscription.dateDebut}`;
    }

    if (!this.userAbonnement) {
      return 'Choose a plan that fits your needs';
    }

    if (this.isFutureSubscription(this.userAbonnement)) {
      const planName = this.getPlanName(this.userAbonnement.abonnementId);
      return `Your next ${planName} plan starts on ${this.userAbonnement.dateDebut}`;
    }

    const planName = this.getPlanName(this.userAbonnement.abonnementId);
    return `You are currently on the ${planName} plan`;
  }

  isCurrentPlan(planId: number): boolean {
    if (!this.currentSubscription?.abonnementId || this.currentSubscription.abonnementId !== planId) {
      return false;
    }

    if (!this.currentSubscription.dateDebut || !this.currentSubscription.dateFin) {
      return true;
    }

    const startDate = this.parseDate(this.currentSubscription.dateDebut);
    const endDate = this.parseDate(this.currentSubscription.dateFin);
    const today = this.getTodayDateOnly();

    if (!startDate || !endDate) {
      return true;
    }

    return startDate <= today && endDate >= today;
  }

  isFutureSubscription(subscription: UserAbonnement | null): boolean {
    if (!subscription?.dateDebut) {
      return false;
    }

    const startDate = this.parseDate(subscription.dateDebut);
    if (!startDate) {
      return false;
    }

    return startDate > this.getTodayDateOnly();
  }

  private getTodayDateOnly(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  }

  getUsageText(ticketsRestants: number): string {
    if (ticketsRestants > 8) {
      return 'Plenty of tickets available!';
    } else if (ticketsRestants > 4) {
      return 'You have a good amount of tickets left';
    } else if (ticketsRestants > 0) {
      return 'Consider booking soon before tickets run out';
    } else {
      return 'No tickets available - renew your subscription';
    }
  }

  getTicketsPercent(ticketsRestants: number): number {
    const max = this.getCurrentPlanMaxTickets();
    return Math.max(0, Math.min(100, (ticketsRestants / max) * 100));
  }

  getCurrentPlanMaxTickets(): number {
    const planId = this.currentSubscription?.abonnementId ?? this.userAbonnement?.abonnementId;

    switch (planId) {
      case 1:
        return 100;
      case 2:
        return 5;
      case 3:
        return 2;
      default:
        return 10;
    }
  }

  // ✅ QR CODE METHODS

  // Open QR Modal and fetch QR code
  openQRModal(): void {
    if (!this.userId || !this.currentSubscription) {
      this.toastService.show('You need an active subscription to show the QR code', 'error');
      return;
    }

    this.showQRModal = true;
    this.loadingQR = true;
    this.scanError = null;

    this.qrService.getQRCode(this.userId).subscribe({
      next: (response) => {
        this.qrCode = response.qrCode;
        this.qrImage = response.imageUrl;
        this.loadingQR = false;
        this.cd.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching QR:', error);
        this.toastService.show('Failed to load QR code', 'error');
        this.loadingQR = false;
        this.showQRModal = false;
        this.cd.markForCheck();
      }
    });
  }

  // Close QR Modal
  closeQRModal(): void {
    this.showQRModal = false;
    this.qrCode = null;
    this.qrImage = null;
    this.scanError = null;
  }

  // Scan QR code and decrement tickets
  scanQR(): void {
    if (!this.qrCode) return;

    this.scanningQR = true;
    this.scanError = null;

    this.qrService.scanQRCode(this.qrCode).subscribe({
      next: (response) => {
        this.toastService.show(`✅ ${response.message}`, 'success');
        this.toastService.show(`Tickets remaining: ${response.ticketsRemaining}`, 'info');

        // Update local tickets
        if (this.userAbonnement) {
          this.userAbonnement.ticketsRestants = response.ticketsRemaining;
        }

        this.scanningQR = false;
        this.closeQRModal();
        this.loadUserSubscription(); // Refresh subscription

        this.cd.markForCheck();
      },
      error: (error) => {
        console.error('Error scanning QR:', error);
        this.scanError = error.error?.error || '❌ Failed to scan QR code';
        if (this.scanError) {
          this.toastService.show(this.scanError, 'error');
        }

        this.scanningQR = false;
        this.cd.markForCheck();
      }
    });
  }

  getQueuedCount(): number {
    return this.queuedSubscriptions.length;
  }

  getHistoryCount(): number {
    return this.historySubscriptions.length;
  }

  openAiModal(): void {
    this.showAiModal = true;
    this.aiError = null;
  }

  closeAiModal(): void {
    this.showAiModal = false;
    this.aiError = null;
  }

  submitRecommendation(): void {
    if (this.recommendationForm.invalid) {
      this.recommendationForm.markAllAsTouched();
      this.toastService.show('Please complete all required fields', 'error');
      return;
    }

    this.aiLoading = true;
    this.aiError = null;
    const rawValue = this.recommendationForm.getRawValue();
    const payload: RecommendationPayload = {
      age: rawValue.age,
      budget: rawValue.budget,
      monthly_cinema_visits: rawValue.monthly_cinema_visits,
      preferred_genre: rawValue.preferred_genre,
      watch_time_pref: rawValue.watch_time_pref,
      has_streaming_subscription: rawValue.has_streaming_subscription === 'yes'
    };

    this.recommendationService.recommend(payload).subscribe({
      next: (response) => {
        this.aiResult = this.normalizeRecommendation(response);
        this.aiLoading = false;
        this.showAiModal = false;
        this.toastService.show(`AI recommends ${this.aiResult.prediction.toUpperCase()}`, 'success');
        this.cd.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.aiLoading = false;
        this.aiError = this.extractAiError(error);
        this.toastService.show(this.aiError, 'error');
        this.cd.markForCheck();
      }
    });
  }

  getAiSortedProbabilities(): Array<{ label: string; value: number }> {
    if (!this.aiResult) {
      return [];
    }

    return Object.entries(this.aiResult.probabilities)
      .map(([label, value]) => ({ label, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value);
  }

  getPredictionBadgeClass(label: string): string {
    const key = label.toLowerCase();
    if (key === 'vip') {
      return 'badge-vip';
    }
    if (key === 'premium') {
      return 'badge-premium';
    }
    return 'badge-standard';
  }

  private normalizeRecommendation(response: RecommendationApiResponse): RecommendationResult {
    const prediction = this.normalizePlanName(
      response.prediction || response.recommendedSubscription || 'standard'
    );

    const probabilities = response.probabilities && Object.keys(response.probabilities).length > 0
      ? this.normalizeProbabilityKeys(response.probabilities)
      : this.buildFallbackProbabilities(prediction, response.confidence);

    const confidence = Math.max(...Object.values(probabilities));

    return {
      prediction,
      probabilities,
      confidence,
    };
  }

  private normalizeProbabilityKeys(probabilities: Record<string, number>): Record<string, number> {
    const normalized: Record<string, number> = {};

    Object.entries(probabilities).forEach(([rawKey, rawValue]) => {
      const key = this.normalizePlanName(rawKey);
      normalized[key] = Number(rawValue) || 0;
    });

    return normalized;
  }

  private buildFallbackProbabilities(prediction: string, confidence?: number): Record<string, number> {
    const c = typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.7;
    const remain = 1 - c;

    if (prediction === 'vip') {
      return { vip: c, premium: remain * 0.7, standard: remain * 0.3 };
    }
    if (prediction === 'premium') {
      return { premium: c, vip: remain * 0.5, standard: remain * 0.5 };
    }
    return { standard: c, premium: remain * 0.7, vip: remain * 0.3 };
  }

  private normalizePlanName(value: string): string {
    const normalized = String(value).trim().toLowerCase();

    if (normalized.includes('vip')) {
      return 'vip';
    }
    if (normalized.includes('premium')) {
      return 'premium';
    }
    return 'standard';
  }

  private extractAiError(error: HttpErrorResponse): string {
    if (typeof error.message === 'string' && error.message.includes('Unexpected token')) {
      return 'AI response is not JSON. Restart Angular with proxy and verify /ml-api/recommend mapping.';
    }

    const apiMessage = typeof error.error === 'object' && error.error
      ? error.error.message || error.error.error
      : null;

    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }

    if (error.status === 0) {
      return 'AI server unavailable. Verify Flask is running on http://127.0.0.1:5001';
    }

    return 'Unable to get AI recommendation right now';
  }
}