import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QRResponse {
  qrCode: string;
  imageUrl: string;
}

export interface ScanResponse {
  message: string;
  ticketsRemaining: number;
  userName: string;
}

@Injectable({
  providedIn: 'root'
})
export class QrService {
  private apiUrl = `${environment.apiUrl}/api/abonnements`;

  constructor(private http: HttpClient) { }

  // ✅ Get QR Code for user
  getQRCode(userId: number): Observable<QRResponse> {
    return this.http.get<QRResponse>(`${this.apiUrl}/qr/${userId}`);
  }

  // ✅ Scan QR Code and decrement tickets
  scanQRCode(qrCode: string): Observable<ScanResponse> {
    return this.http.post<ScanResponse>(`${this.apiUrl}/scan`, { qrCode });
  }
}
