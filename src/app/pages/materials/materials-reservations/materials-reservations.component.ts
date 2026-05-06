import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReservationMaterielService } from '../../../features/material/services/reservation-materiel.service';
import { MaterielService } from '../../../features/material/services/materiel.service';
import { CategorieMaterielService } from '../../../features/material/services/category-materiel.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationMateriel } from '../../../features/material/models/reservation-materiel.model';
import { Materiel, MaterielStatus } from '../../../features/material/models/materiel.model';
import { CategorieMateriel } from '../../../features/material/models/category-materiel.model';
import { Subject } from 'rxjs';
import { takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-materials-reservations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './materials-reservations.component.html',
  styleUrl: './materials-reservations.component.scss'
})
export class MaterialsReservationsComponent implements OnInit, OnDestroy {
  // Materials
  categories: CategorieMateriel[] = [];
  materials: Materiel[] = [];
  isLoadingMaterials = true;
  materialsError = '';
  selectedCategory: CategorieMateriel | null = null;
  showMaterialsView = false;

  // Reservations
  reservations: ReservationMateriel[] = [];
  isLoadingReservations = true;
  reservationsError = '';

  // Component lifecycle
  private destroy$ = new Subject<void>();
  currentUserId: number | null = null;

  constructor(
    private materielService: MaterielService,
    private categorieMaterielService: CategorieMaterielService,
    private reservationService: ReservationMaterielService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();

    if (!this.currentUserId) {
      this.reservationsError = 'You must be logged in to view reservations.';
      this.isLoadingReservations = false;
      return;
    }

    this.loadCategories();
    this.loadUserReservations();

    // Refresh reservations every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadUserReservations();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.isLoadingMaterials = true;
    this.materialsError = '';
    console.log('Loading material categories...');

    this.categorieMaterielService.getAllCategories().subscribe({
      next: (data) => {
        console.log('✓ Categories loaded:', data);
        setTimeout(() => {
          this.categories = data;
          this.isLoadingMaterials = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading categories:', err);
        setTimeout(() => {
          this.materialsError = `Failed to load categories: ${err.message || err.statusText || 'Unknown error'}`;
          this.isLoadingMaterials = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  selectCategory(category: CategorieMateriel): void {
    this.selectedCategory = category;
    this.loadMaterialsByCategory(category.id);
  }

  loadMaterialsByCategory(categoryId: number): void {
    this.isLoadingMaterials = true;
    console.log(`Loading materials for category ${categoryId}...`);

    this.materielService.getMaterielsByCategorie(categoryId).subscribe({
      next: (data) => {
        console.log('✓ Materials loaded:', data);
        // Filter only ACTIVE materials
        const activeMaterials = data.filter(m => m.status === MaterielStatus.ACTIVE);
        setTimeout(() => {
          this.materials = activeMaterials;
          this.isLoadingMaterials = false;
          this.showMaterialsView = true;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading materials:', err);
        this.isLoadingMaterials = false;
        this.materials = [];
        this.showMaterialsView = true;
        this.cdr.markForCheck();
      }
    });
  }

  loadUserReservations(): void {
    if (!this.currentUserId) {
      return;
    }

    console.log(`Loading reservations for user ${this.currentUserId}...`);

    this.reservationService.getByUser(this.currentUserId).subscribe({
      next: (data) => {
        console.log('✓ Reservations loaded:', data);
        setTimeout(() => {
          this.reservations = data;
          this.isLoadingReservations = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading reservations:', err);
        setTimeout(() => {
          this.reservationsError = `Failed to load reservations: ${err.message || err.statusText || 'Unknown error'}`;
          this.isLoadingReservations = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  goBack(): void {
    this.showMaterialsView = false;
    this.selectedCategory = null;
    this.materials = [];
    this.cdr.markForCheck();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  cancelReservation(id: number): void {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      this.reservationService.annuler(id).subscribe({
        next: () => {
          console.log('✓ Reservation cancelled');
          this.loadUserReservations();
        },
        error: (err) => {
          console.error('✗ Error cancelling reservation:', err);
          alert('Failed to cancel reservation. Please try again.');
        }
      });
    }
  }
}
