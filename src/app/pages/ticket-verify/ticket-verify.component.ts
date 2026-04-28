import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import jsPDF from 'jspdf';
import { ReservationCinemaEntity } from '../../core/models/reservation-cinema.model';
import { SeanceResponse } from '../../core/models/seance.model';
import { ReservationCinemaService } from '../../core/services/reservation-cinema.service';

@Component({
  selector: 'app-ticket-verify',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ticket-verify.component.html'
})
export class TicketVerifyComponent implements OnInit {
  loading = true;
  pdfGenerating = false;
  errorMessage = '';
  ticket: ReservationCinemaEntity | null = null;
  pdfUrl: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly reservationCinemaService: ReservationCinemaService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || Number.isNaN(id)) {
      this.loading = false;
      this.errorMessage = 'Reservation not found.';
      return;
    }

    this.reservationCinemaService.getById(id).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.generatePdf(ticket);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load reservation details.';
      },
    });
  }

  getTicketShowtime(ticket: ReservationCinemaEntity | null): SeanceResponse | null {
    return ticket?.seance ?? null;
  }

  getFilmTitle(ticket: ReservationCinemaEntity | null): string {
    const seance = this.getTicketShowtime(ticket);
    if (!seance) return 'Movie unavailable';
    return (seance as any).filmTitle || seance.film?.title || 'Movie unavailable';
  }

  getSeatNumber(ticket: ReservationCinemaEntity | null): string {
    const seat = ticket?.seat as any;
    const value =
      seat?.seatNumber ??
      seat?.numero ??
      seat?.seat_number ??
      this.extractSeatNumberFromLabel(seat?.fullLabel ?? seat?.label) ??
      ticket?.seatId;
    return value != null ? String(value) : '-';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date);
  }

  getStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'CANCELLED': return 'Cancelled';
      case 'PENDING': return 'Pending';
      default: return 'Pending';
    }
  }

  getStatusClasses(status: string | null | undefined): string {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
      default: return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    }
  }

  downloadPdf(): void {
    if (!this.pdfUrl) return;
    const link = document.createElement('a');
    link.href = this.pdfUrl;
    link.download = `rawabet-ticket-${this.ticket?.id ?? 'reservation'}.pdf`;
    link.click();
  }

  private generatePdf(ticket: ReservationCinemaEntity): void {
    this.pdfGenerating = true;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    pdf.setFillColor(21, 33, 58);
    pdf.rect(0, 0, 210, 45, 'F');
    pdf.setFillColor(197, 90, 17);
    pdf.rect(0, 45, 210, 6, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(24);
    pdf.text('Rawabet Cinema', 16, 20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Reservation ticket', 16, 29);

    pdf.setTextColor(30, 41, 59);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(14, 60, 182, 115, 6, 6, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(this.getFilmTitle(ticket), 22, 78);

    const status = this.getStatusLabel(ticket.statut);
    pdf.setFillColor(...this.getPdfStatusColor(ticket.statut));
    pdf.roundedRect(145, 68, 38, 11, 5, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text(status, 164, 75, { align: 'center' });

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Reservation', 22, 95);
    pdf.text('Showtime', 22, 117);
    pdf.text('Seat', 22, 139);
    pdf.text('Reservation date', 22, 161);
    pdf.text('Room', 110, 95);
    pdf.text('Language', 110, 117);
    pdf.text('Price', 110, 139);
    pdf.text('Genre', 110, 161);

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(`#${ticket.id}`, 22, 103);
    pdf.text(this.formatDateTime(ticket.seance?.dateHeure), 22, 125, { maxWidth: 72 });
    pdf.text(this.getSeatNumber(ticket), 22, 147);
    pdf.text(this.formatDate(ticket.dateReservation), 22, 169, { maxWidth: 72 });
    pdf.text(ticket.seance?.salleCinemaName || ticket.seance?.salleCinema?.name || '-', 110, 103, { maxWidth: 72 });
    pdf.text(ticket.seance?.langue || '-', 110, 125);
    pdf.text(`${ticket.seance?.prixBase ?? '-'} TND`, 110, 147);
    pdf.text(ticket.seance?.film?.genre || '-', 110, 169, { maxWidth: 72 });

    pdf.setDrawColor(226, 232, 240);
    pdf.line(14, 188, 196, 188);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.text('Document generated from the Rawabet Cinema QR code.', 16, 198);

    const pdfBlob = pdf.output('blob');
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
    }
    this.pdfUrl = URL.createObjectURL(pdfBlob);
    this.pdfGenerating = false;
  }

  private getPdfStatusColor(status: string | null | undefined): [number, number, number] {
    switch (status) {
      case 'CONFIRMED':
        return [22, 163, 74];
      case 'CANCELLED':
        return [225, 29, 72];
      default:
        return [217, 119, 6];
    }
  }

  private extractSeatNumberFromLabel(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }
}

