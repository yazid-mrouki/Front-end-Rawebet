import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Abonnement {
  id: number;
  type: string;
  nbTicketsParMois: number;
  illimite: boolean;
  popcornGratuit: boolean;
  prix: number;
}

export interface UserSubscriptionResponse {
  userId: number;
  userAbonnementId: number;
  abonnementId: number;
  abonnementNom: string;
  abonnementType: string;
  ticketsRestants: number;
  dateDebut: string;
  dateFin: string;
}

export interface QRCodeResponse {
  qrCode: string;
  imageUrl: string;
}

export interface ScanQRResponse {
  message: string;
  ticketsRemaining: number;
  userName: string;
  abonnementType: string;
}

export interface QRCodeStatus {
  qrCode: string;
  used: boolean;
  createdAt: string;
  scannedAt: string | null;
  ticketsRemaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {

  private apiUrl = '/api/subscriptions'; // Adjust if needed

  // Observable for tracking subscription changes
  private currentSubscription$ = new BehaviorSubject<UserSubscriptionResponse | null>(null);

  constructor(private http: HttpClient) {}

  // ============================================
  // Get All Abonnements
  // ============================================
  getAllAbonnements(): Observable<Abonnement[]> {
    return this.http.get<Abonnement[]>(`${this.apiUrl}`);
  }

  // ============================================
  // Subscribe + Generate QR Code
  // ============================================
  subscribe(userId: number, abonnementId: number): Observable<UserSubscriptionResponse> {
    return this.http.post<UserSubscriptionResponse>(
      `${this.apiUrl}/subscribe/${userId}/${abonnementId}`,
      {}
    ).pipe(
      tap(subscription => {
        console.log('✅ Subscription successful:', subscription);
        this.currentSubscription$.next(subscription);
      })
    );
  }

  // ============================================
  // Get User Subscription
  // ============================================
  getSubscriptionByUserId(userId: number): Observable<UserSubscriptionResponse> {
    return this.http.get<UserSubscriptionResponse>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        tap(subscription => {
          console.log('📋 Subscription fetched:', subscription);
          this.currentSubscription$.next(subscription);
        })
      );
  }

  // ============================================
  // Get QR Code
  // ============================================
  getQRCode(userId: number): Observable<QRCodeResponse> {
    return this.http.get<QRCodeResponse>(`${this.apiUrl}/qr/${userId}`)
      .pipe(
        tap(response => {
          console.log('🎯 QR Code generated:', response);
        })
      );
  }

  // ============================================
  // Get QR Code Status
  // ============================================
  getQRCodeStatus(userId: number): Observable<QRCodeStatus> {
    return this.http.get<QRCodeStatus>(`${this.apiUrl}/qr-status/${userId}`)
      .pipe(
        tap(status => {
          console.log('📊 QR Code status:', status);
        })
      );
  }

  // ============================================
  // Scan QR Code
  // ============================================
  scanQRCode(qrCode: string): Observable<ScanQRResponse> {
    return this.http.post<ScanQRResponse>(
      `${this.apiUrl}/scan`,
      { qrCode }
    ).pipe(
      tap(response => {
        console.log('✅ QR Scan successful:', response);
      })
    );
  }

  // ============================================
  // Get All Subscriptions
  // ============================================
  getAllSubscriptions(): Observable<UserSubscriptionResponse[]> {
    return this.http.get<UserSubscriptionResponse[]>(`${this.apiUrl}/all`);
  }

  // ============================================
  // Observable Getters
  // ============================================
  getCurrentSubscription(): Observable<UserSubscriptionResponse | null> {
    return this.currentSubscription$.asObservable();
  }

  // ============================================
  // Download QR Code Image
  // ============================================
  downloadQRCode(qrCode: string, fileName: string = 'qr-code.png'): void {
    const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCode}`;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.click();
  }

  // ============================================
  // Get QR Image URL
  // ============================================
  getQRImageUrl(qrCode: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCode}`;
  }
}