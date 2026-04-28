import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface InvoiceResponse {
  id: number;
  invoiceNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  abonnementName: string;
  abonnementType: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  description: string;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  notes: string;
}

export interface InvoiceStatistics {
  pendingCount: number;
  paidCount: number;
  totalInvoiced: number;
  totalPaid: number;
  amountDue: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  private apiUrl = '/api/invoices';

  constructor(private http: HttpClient) {}

  // ============================================
  // Get All User Invoices
  // ============================================
  getUserInvoices(userId: number): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/user/${userId}`)
      .pipe(
        tap(invoices => {
          console.log('✅ Invoices fetched:', invoices);
        })
      );
  }

  // ============================================
  // Get User Pending Invoices
  // ============================================
  getUserPendingInvoices(userId: number): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/user/${userId}/pending`)
      .pipe(
        tap(invoices => {
          console.log('📋 Pending invoices:', invoices);
        })
      );
  }

  // ============================================
  // Get User Paid Invoices
  // ============================================
  getUserPaidInvoices(userId: number): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/user/${userId}/paid`)
      .pipe(
        tap(invoices => {
          console.log('✅ Paid invoices:', invoices);
        })
      );
  }

  // ============================================
  // Get Invoice by ID
  // ============================================
  getInvoiceById(invoiceId: number): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(`${this.apiUrl}/${invoiceId}`)
      .pipe(
        tap(invoice => {
          console.log('✅ Invoice fetched:', invoice);
        })
      );
  }

  // ============================================
  // Get Invoice by Invoice Number
  // ============================================
  getInvoiceByNumber(invoiceNumber: string): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(`${this.apiUrl}/number/${invoiceNumber}`)
      .pipe(
        tap(invoice => {
          console.log('✅ Invoice fetched:', invoice);
        })
      );
  }

  // ============================================
  // Get Invoice Statistics
  // ============================================
  getInvoiceStatistics(userId: number): Observable<InvoiceStatistics> {
    return this.http.get<InvoiceStatistics>(`${this.apiUrl}/user/${userId}/statistics`)
      .pipe(
        tap(stats => {
          console.log('📊 Invoice statistics:', stats);
        })
      );
  }

  // ============================================
  // Mark Invoice as Paid (Admin)
  // ============================================
  markInvoiceAsPaid(invoiceId: number): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(`${this.apiUrl}/${invoiceId}/mark-paid`, {})
      .pipe(
        tap(invoice => {
          console.log('✅ Invoice marked as paid:', invoice);
        })
      );
  }

  // ============================================
  // Cancel Invoice (Admin)
  // ============================================
  cancelInvoice(invoiceId: number, reason: string): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(`${this.apiUrl}/${invoiceId}/cancel`, { reason })
      .pipe(
        tap(invoice => {
          console.log('❌ Invoice cancelled:', invoice);
        })
      );
  }

  // ============================================
  // Get All Pending Invoices (Admin)
  // ============================================
  getAllPendingInvoices(): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/admin/pending`)
      .pipe(
        tap(invoices => {
          console.log('📋 All pending invoices:', invoices);
        })
      );
  }

  // ============================================
  // Get Overdue Invoices (Admin)
  // ============================================
  getOverdueInvoices(): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/admin/overdue`)
      .pipe(
        tap(invoices => {
          console.log('⚠️ Overdue invoices:', invoices);
        })
      );
  }

  // ============================================
  // Download Invoice PDF
  // ============================================
  downloadInvoicePDF(invoiceId: number): void {
    const url = `${this.apiUrl}/${invoiceId}/pdf`;
    window.open(url, '_blank');
  }

  // ============================================
  // Send Invoice Email
  // ============================================
  sendInvoiceEmail(invoiceId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/send-email`, {})
      .pipe(
        tap(() => {
          console.log('📧 Email sent successfully');
        })
      );
  }

  // ============================================
  // Export Invoices as CSV
  // ============================================
  exportInvoicesAsCSV(userId: number): void {
    const url = `${this.apiUrl}/user/${userId}/export-csv`;
    window.open(url, '_blank');
  }
}
