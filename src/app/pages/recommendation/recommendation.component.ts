import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { RecommendationService } from '../../core/services/recommendation.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast';
import { UserAbonnement } from '../../core/models/subscription.model';

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recommendation.component.html',
  styleUrls: ['./recommendation.component.css']
})
export class RecommendationComponent implements OnInit {

  // ✅ FORM & DATA
  recommendationForm!: FormGroup;
  loading = false;
  submitting = false;
  recommendation: any = null;

  // ✅ AUTO-FILLED DATA (from user_abonnement)
  autoFilledData: any = null;
  userId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private recommendationService: RecommendationService,
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    public toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    this.initForm();
    this.loadUserData();
  }

  // ✅ INITIALIZE FORM
  initForm(): void {
    this.recommendationForm = this.fb.group({
      // ✅ AUTO-FILLED (read-only or pre-filled)
      age: [{ value: '', disabled: false }, Validators.required],
      monthly_cinema_visits: [{ value: '', disabled: false }, Validators.required],
      last_booking_days_ago: [{ value: '', disabled: false }, Validators.required],
      budget: [{ value: '', disabled: false }, Validators.required],
      watch_time_pref: [{ value: '', disabled: false }, Validators.required],
      avg_ticket_price: [{ value: '', disabled: false }],

      // ✅ EMPTY FIELDS (user can modify)
      preferred_genre: ['', Validators.required],
      has_streaming_subscription: [false],
      group_size: [''],
      distance_km: [''],
      app_sessions_per_week: [''],
      promo_sensitivity: [''],
      satisfaction_score: ['']
    });
  }

  // ✅ LOAD USER DATA FROM SUBSCRIPTION SERVICE
  loadUserData(): void {
    if (!this.userId) {
      console.error('❌ No userId found');
      this.toastService.show('❌ User not authenticated', 'error');
      this.loading = false;
      return;
    }

    this.loading = true;
    console.log(`📥 Loading subscriptions for user ${this.userId}...`);

    // Call the service that returns user subscription + QR data
    this.subscriptionService.getUserSubscriptionsWithQR(this.userId).subscribe({
      next: (subscriptions: any[]) => {
        console.log('📦 Subscriptions received:', subscriptions);

        if (!subscriptions || subscriptions.length === 0) {
          console.warn('⚠️ No subscriptions found');
          this.toastService.show('⚠️ No subscription data found', 'info');
          this.loading = false;
          this.cd.markForCheck();
          return;
        }

        const userSub = subscriptions[0]; // Get first/active subscription
        console.log('🔍 Using subscription:', userSub);

        // ✅ AUTO-FILL FROM USER_ABONNEMENT
        this.autoFilledData = {
          age: 25, // Default - TODO: Get from user profile if available
          monthly_cinema_visits: this.calculateMonthlyVisits(userSub),
          last_booking_days_ago: this.calculateLastBookingDays(userSub),
          budget: this.calculateMonthlyBudget(userSub),
          watch_time_pref: this.calculateWatchTimePref(userSub),
          avg_ticket_price: this.calculateAvgTicketPrice(userSub)
        };

        console.log('✅ Auto-filled data:', this.autoFilledData);

        // SET VALUES IN FORM
        this.recommendationForm.patchValue(this.autoFilledData);

        this.toastService.show('✅ Profile data loaded successfully!', 'success');
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (error: any) => {
        console.error('❌ Error loading user data:', error);
        console.error('Error details:', error.error);
        this.toastService.show(`❌ Failed to load user data: ${error.error?.message || error.statusText}`, 'error');
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  // ✅ CALCULATE MONTHLY VISITS FROM QR SCANS
  calculateMonthlyVisits(userSub: any): number {
    try {
      // Try different property names for QR codes
      const qrCodes = userSub.qrCodes || userSub.qr_codes || userSub.qrs || [];

      if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
        console.log('📊 No QR codes found, defaulting to 4');
        return 4; // Default
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyScans = qrCodes.filter((qr: any) => {
        if (!qr.scannedAt && !qr.scanned_at) return false;
        const scanDate = new Date(qr.scannedAt || qr.scanned_at);
        return scanDate.getMonth() === currentMonth && scanDate.getFullYear() === currentYear;
      });

      console.log(`📊 Monthly visits: ${monthlyScans.length}`);
      return monthlyScans.length || 4; // Default if none found
    } catch (e) {
      console.error('Error calculating monthly visits:', e);
      return 4; // Default
    }
  }

  // ✅ CALCULATE DAYS SINCE LAST BOOKING
  calculateLastBookingDays(userSub: any): number {
    try {
      const qrCodes = userSub.qrCodes || userSub.qr_codes || userSub.qrs || [];

      if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
        console.log('📅 No bookings found, defaulting to 5 days');
        return 5; // Default
      }

      const lastQR = qrCodes.reduce((latest: any, current: any) => {
        const latestDate = new Date(latest.scannedAt || latest.scanned_at || 0);
        const currentDate = new Date(current.scannedAt || current.scanned_at || 0);
        return currentDate > latestDate ? current : latest;
      });

      if (!lastQR.scannedAt && !lastQR.scanned_at) {
        console.log('📅 No scan date found, defaulting to 5 days');
        return 5;
      }

      const now = new Date();
      const lastBooking = new Date(lastQR.scannedAt || lastQR.scanned_at);
      const diffTime = Math.abs(now.getTime() - lastBooking.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log(`📅 Last booking: ${diffDays} days ago`);
      return diffDays;
    } catch (e) {
      console.error('Error calculating last booking days:', e);
      return 5; // Default
    }
  }

  // ✅ CALCULATE MONTHLY BUDGET
  calculateMonthlyBudget(userSub: any): number {
    try {
      const monthlyVisits = this.calculateMonthlyVisits(userSub);
      const avgPrice = this.calculateAvgTicketPrice(userSub);
      const budget = monthlyVisits * avgPrice;

      console.log(`💰 Monthly budget: ${budget} (${monthlyVisits} visits * $${avgPrice})`);
      return budget;
    } catch (e) {
      console.error('Error calculating budget:', e);
      return 50; // Default
    }
  }

  // ✅ CALCULATE AVERAGE TICKET PRICE
  calculateAvgTicketPrice(userSub: any): number {
    try {
      const avgPrice = userSub.avgTicketPrice || userSub.avg_ticket_price || 10;
      console.log(`💵 Average ticket price: $${avgPrice}`);
      return avgPrice;
    } catch (e) {
      console.error('Error calculating avg ticket price:', e);
      return 10; // Default
    }
  }

  // ✅ CALCULATE WATCH TIME PREFERENCE
  calculateWatchTimePref(userSub: any): string {
    try {
      const monthlyVisits = this.calculateMonthlyVisits(userSub);

      if (monthlyVisits >= 8) {
        console.log('🎬 Watch preference: frequent');
        return 'frequent';
      }
      if (monthlyVisits >= 4) {
        console.log('🎬 Watch preference: moderate');
        return 'moderate';
      }
      console.log('🎬 Watch preference: occasional');
      return 'occasional';
    } catch (e) {
      console.error('Error calculating watch time pref:', e);
      return 'moderate'; // Default
    }
  }

  // ✅ SUBMIT FORM TO FLASK
  submitRecommendation(): void {
    if (!this.recommendationForm.valid) {
      this.toastService.show('❌ Please fill all required fields', 'error');
      return;
    }

    this.submitting = true;

    // Get form data
    const payload = this.recommendationForm.getRawValue(); // getRawValue includes disabled fields

    console.log('📤 Sending to Flask:', payload);

    this.recommendationService.recommend(payload).subscribe({
      next: (response) => {
        console.log('📥 Flask Response:', response);
        this.recommendation = response;

        this.toastService.show(
          `✅ Recommendation: ${response.recommendedSubscription}`,
          'success'
        );

        this.submitting = false;
        this.cd.markForCheck();
      },
      error: (error: any) => {
        console.error('❌ Error:', error);
        this.toastService.show('❌ Failed to get recommendation', 'error');
        this.submitting = false;
        this.cd.markForCheck();
      }
    });
  }

  // ✅ RELOAD DATA
  reloadData(): void {
    this.loadUserData();
  }
}
