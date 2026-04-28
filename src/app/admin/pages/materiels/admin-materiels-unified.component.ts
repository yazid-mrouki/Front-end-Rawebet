import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject, Subscription, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MaterielService } from '../../../features/material/services/materiel.service';
import { CategorieMaterielService } from '../../../features/material/services/category-materiel.service';
import { ReservationMaterielService } from '../../../features/material/services/reservation-materiel.service';
import { MLRiskService } from '../../../features/material/services/ml-risk-service';
import { Materiel, CreateMaterielRequest, UpdateMaterielRequest, MaterielStatus } from '../../../features/material/models/materiel.model';
import { CategorieMateriel, CreateCategorieMaterielRequest, UpdateCategorieMaterielRequest } from '../../../features/material/models/category-materiel.model';
import { ReservationMateriel } from '../../../features/material/models/reservation-materiel.model';

type ViewMode = 'categories' | 'materials';
type ModalStep = 'list' | 'create' | 'edit';

interface AIRiskAssessment {
  riskLevel: 'AT_RISK' | 'MODERATE_RISK' | 'SAFE' | 'INSUFFICIENT_DATA' | 'UNKNOWN' | 'UNAVAILABLE' | string;
  riskBadge: string;
  damageProbability?: number;
  damageProbabilityPct?: string;
  riskMessage: string;
  needsMaintenance?: boolean;
  newMaterial?: boolean;
  mlAvailable?: boolean;
  color: string;
}

@Component({
  selector: 'app-admin-materiels-unified',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-materiels-unified.component.html'
})
export class AdminMaterielsUnifiedComponent implements OnInit, OnDestroy {

  // ── View mode ────────────────────────────────────
  viewMode: ViewMode = 'categories';
  selectedCategory: CategorieMateriel | null = null;

  // ── Categories ───────────────────────────────────
  categories: CategorieMateriel[] = [];
  categoriesSearchQuery = '';
  categoriesLoading = true;
  categoriesError = '';

  // ── Materials ────────────────────────────────────
  materiels: Materiel[] = [];
  filteredMateriels: Materiel[] = [];
  materielSearchQuery = '';
  selectedStatusFilter = 'all';
  materielsLoading = false;
  materielsError = '';

  // ── Modal state ──────────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'list';
  isSubmitting = false;
  errorMessage = '';

  // ── Category form ────────────────────────────────
  selectedCategory_Edit: CategorieMateriel | null = null;
  categoryForm: CreateCategorieMaterielRequest = { nom: '', description: '' };

  // ── Material form ────────────────────────────────
  selectedMateriel: Materiel | null = null;
  materielForm: CreateMaterielRequest = this.emptyMaterielForm();

  // ── Reservations ─────────────────────────────────
  reservations: ReservationMateriel[] = [];
  showReservationsModal = false;
  reservationsLoading = false;
  reservationsError = '';
  selectedMaterielForReservations: Materiel | null = null;

  // ── AI test modal ────────────────────────────────
  showAIRiskModal = false;
  selectedMaterielForAI: Materiel | null = null;
  selectedAIRisk: AIRiskAssessment | null = null;

  // ── Status modification modal ────────────────────
  showStatusModal = false;
  selectedReservationForStatusChange: any = null;
  newReservationStatus: string = '';
  statusModificationSubmitting = false;
  statusModificationError = '';

  // ── Search subjects ──────────────────────────────
  categoriesSearchSubject = new Subject<string>();
  materielsSearchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Status enum ──────────────────────────────────
  statusOptions = Object.values(MaterielStatus);
  reservationStatusOptions = ['PENDING', 'CONFIRMED', 'CANCELLED'];

  constructor(
    private materielService: MaterielService,
    private categorieService: CategorieMaterielService,
    private reservationService: ReservationMaterielService,
    private mlRiskService: MLRiskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();

    // Categories search
    this.searchSub = this.categoriesSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.categoriesSearchQuery = query;
      this.cdr.detectChanges();
    });

    // Materials search
    this.materielsSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.materielSearchQuery = query;
      this.filterMateriels();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // CATEGORIES SECTION
  // ══════════════════════════════════════════════════════════════════════════════════

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categorieService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categoriesError = 'Failed to load categories.';
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredCategories(): CategorieMateriel[] {
    return this.categories.filter(cat =>
      cat.nom.toLowerCase().includes(this.categoriesSearchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(this.categoriesSearchQuery.toLowerCase())
    );
  }

  // ── Category CRUD ────────────────────────────────

  openCreateCategoryModal(): void {
    this.categoryForm = { nom: '', description: '' };
    this.selectedCategory_Edit = null;
    this.modalStep = 'create';
    this.showModal = true;
    this.errorMessage = '';
  }

  openEditCategoryModal(category: CategorieMateriel): void {
    this.selectedCategory_Edit = category;
    this.categoryForm = {
      nom: category.nom,
      description: category.description
    };
    this.modalStep = 'edit';
    this.showModal = true;
    this.errorMessage = '';
  }

  createCategory(): void {
    if (!this.categoryForm.nom || !this.categoryForm.description) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.categorieService.addCategorie(this.categoryForm).subscribe({
      next: (newCategory) => {
        this.categories.push(newCategory);
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating category:', err);
        this.errorMessage = err.error?.message || 'Failed to create category.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateCategory(): void {
    if (!this.categoryForm.nom || !this.categoryForm.description) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    if (!this.selectedCategory_Edit?.id) {
      this.errorMessage = 'Category not selected.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.categorieService.updateCategorie(this.selectedCategory_Edit.id, this.categoryForm).subscribe({
      next: (updatedCategory) => {
        const index = this.categories.findIndex(c => c.id === updatedCategory.id);
        if (index !== -1) {
          this.categories[index] = updatedCategory;
        }
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating category:', err);
        this.errorMessage = err.error?.message || 'Failed to update category.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteCategory(id: number): void {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    this.categorieService.deleteCategorie(id).subscribe({
      next: () => {
        this.categories = this.categories.filter(c => c.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting category:', err);
        alert('Failed to delete category.');
      }
    });
  }

  // ── View materials by category ───────────────────

  viewMaterials(category: CategorieMateriel): void {
    this.selectedCategory = category;
    this.viewMode = 'materials';
    this.loadMaterielsByCategory(category.id);
  }

  backToCategories(): void {
    this.viewMode = 'categories';
    this.selectedCategory = null;
    this.materiels = [];
    this.materielSearchQuery = '';
  }

  loadMaterielsByCategory(categoryId: number): void {
    this.materielsLoading = true;
    this.materielsError = '';

    forkJoin({
      materials: this.materielService.getMaterielsByCategorie(categoryId),
      risks: this.mlRiskService.getAllMaterialsWithRisk()
    }).subscribe({
      next: ({ materials, risks }) => {
        setTimeout(() => {
          const riskById = new Map(risks.map(risk => [risk.id, risk]));
          this.materiels = materials.map(material => ({
            ...material,
            ...riskById.get(material.id)
          }));
          this.filterMateriels();
          this.materielsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading materials:', err);
        setTimeout(() => {
          this.materielsError = 'Failed to load materials.';
          this.materiels = [];
          this.filteredMateriels = [];
          this.materielsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // MATERIALS SECTION (within category)
  // ══════════════════════════════════════════════════════════════════════════════════

  filterMateriels(): void {
    this.filteredMateriels = this.materiels.filter(mat => {
      const matchSearch = mat.nom.toLowerCase().includes(this.materielSearchQuery.toLowerCase()) ||
                         mat.reference.toLowerCase().includes(this.materielSearchQuery.toLowerCase());
      const matchStatus = this.selectedStatusFilter === 'all' || mat.status === this.selectedStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  // ── View Reservations ────────────────────────────

  viewMaterielReservations(material: Materiel): void {
    this.selectedMaterielForReservations = material;
    this.showReservationsModal = true;
    this.loadMaterielOccupation(material.id);
  }

  loadMaterielOccupation(materielId: number): void {
    this.reservationsLoading = true;
    this.reservationsError = '';
    this.materielService.getFullOccupation(materielId).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.reservations = data;
          this.reservationsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading reservations:', err);
        setTimeout(() => {
          this.reservationsError = 'Failed to load reservations.';
          this.reservations = [];
          this.reservationsLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  // ── Computed getters for reservation filtering ──────────────────────

  get eventReservations(): any[] {
    return this.reservations.filter((r: any) => r.evenementId);
  }

  get standaloneReservations(): any[] {
    return this.reservations.filter((r: any) => !r.evenementId);
  }

  closeReservationsModal(): void {
    this.showReservationsModal = false;
    this.selectedMaterielForReservations = null;
    this.reservations = [];
    this.reservationsError = '';
  }

  // ── AI Risk Assessment ──────────────────────────

  getAIRiskForMaterial(material: Materiel): AIRiskAssessment {
    return {
      riskLevel: material.riskLevel || 'UNAVAILABLE',
      riskBadge: material.riskBadge || this.buildFallbackRiskBadge(material),
      damageProbability: material.damageProbability,
      damageProbabilityPct: material.damageProbabilityPct || this.formatDamageProbability(material.damageProbability),
      riskMessage: material.riskMessage || this.buildFallbackRiskMessage(material),
      needsMaintenance: material.needsMaintenance,
      newMaterial: material.newMaterial,
      mlAvailable: material.mlAvailable,
      color: this.getRiskBadgeColor(material.riskLevel).bg + ' ' + this.getRiskBadgeColor(material.riskLevel).text
    };
  }

  private buildFallbackRiskBadge(material: Materiel): string {
    if (material.riskLevel === 'AT_RISK') {
      return `🔴 AT RISK${material.damageProbabilityPct ? ` (${material.damageProbabilityPct})` : ''}`;
    }
    if (material.riskLevel === 'MODERATE_RISK') {
      return `🟡 MODERATE RISK${material.damageProbabilityPct ? ` (${material.damageProbabilityPct})` : ''}`;
    }
    if (material.riskLevel === 'SAFE') {
      return `🟢 SAFE${material.damageProbabilityPct ? ` (${material.damageProbabilityPct})` : ''}`;
    }
    if (material.riskLevel === 'INSUFFICIENT_DATA') {
      return '🔵 INSUFFICIENT DATA';
    }
    if (material.riskLevel === 'UNAVAILABLE') {
      return '⚠️ UNAVAILABLE';
    }
    return '⚪ N/A';
  }

  private buildFallbackRiskMessage(material: Materiel): string {
    switch (material.riskLevel) {
      case 'AT_RISK':
        return '⚠️ HIGH RISK — immediate maintenance recommended.';
      case 'MODERATE_RISK':
        return '⚠️ MODERATE RISK — consider scheduling a maintenance check soon.';
      case 'SAFE':
        return 'ℹ️ LOW RISK — monitor usage, no immediate action needed.';
      case 'INSUFFICIENT_DATA':
        return 'ℹ️ NEW MATERIAL — no prediction data available yet. Wait for usage history.';
      case 'UNAVAILABLE':
        return '⚠️ ML API currently unavailable — cannot assess risk.';
      default:
        return '⚪ Risk data unavailable.';
    }
  }

  private getRiskBadgeColor(riskLevel?: string): { bg: string; text: string } {
    switch (riskLevel) {
      case 'AT_RISK':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      case 'MODERATE_RISK':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 'SAFE':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'INSUFFICIENT_DATA':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'UNAVAILABLE':
        return { bg: 'bg-orange-100', text: 'text-orange-700' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  }

  private formatDamageProbability(probability?: number): string {
    if (typeof probability !== 'number') {
      return 'N/A';
    }

    return `${(probability * 100).toFixed(1)}%`;
  }

  openAIRiskModal(material: Materiel): void {
    this.selectedMaterielForAI = material;
    this.selectedAIRisk = this.getAIRiskForMaterial(material);
    this.showAIRiskModal = true;
  }

  closeAIRiskModal(): void {
    this.showAIRiskModal = false;
    this.selectedMaterielForAI = null;
    this.selectedAIRisk = null;
  }

  // ── Reservation Status Management ────────────────────

  openStatusModificationModal(reservation: any): void {
    console.log('Opening status modal for reservation:', reservation);
    this.selectedReservationForStatusChange = reservation;
    this.newReservationStatus = reservation.statut;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedReservationForStatusChange = null;
    this.newReservationStatus = '';
    this.statusModificationError = '';
  }

  submitStatusChange(): void {
    if (!this.selectedReservationForStatusChange || !this.newReservationStatus) {
      return;
    }

    // Try multiple possible field names for the ID
    const reservationId = this.selectedReservationForStatusChange.id
      || this.selectedReservationForStatusChange.reservationId
      || this.selectedReservationForStatusChange.reservationMaterielId;
    const newStatus = this.newReservationStatus;

    console.log('Submitting status change - ID:', reservationId, 'Status:', newStatus);
    console.log('Full reservation object:', this.selectedReservationForStatusChange);

    if (!reservationId) {
      alert('Error: Could not find reservation ID. Available fields: ' + Object.keys(this.selectedReservationForStatusChange).join(', '));
      return;
    }

    this.statusModificationSubmitting = true;

    // Call appropriate endpoint based on status
    let updateCall: Observable<any>;

    if (newStatus === 'CONFIRMED') {
      updateCall = this.reservationService.confirmer(reservationId);
    } else if (newStatus === 'CANCELLED') {
      updateCall = this.reservationService.annuler(reservationId);
    } else {
      // For PENDING or other statuses, we might need a general update endpoint
      // For now, just reload
      this.statusModificationSubmitting = false;
      this.closeStatusModal();
      this.loadMaterielOccupation(this.selectedMaterielForReservations!.id);
      return;
    }

    updateCall.subscribe({
      next: () => {
        setTimeout(() => {
          this.statusModificationSubmitting = false;
          this.closeStatusModal();
          this.loadMaterielOccupation(this.selectedMaterielForReservations!.id);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err: any) => {
        console.error('Error updating reservation status:', err);
        setTimeout(() => {
          this.statusModificationSubmitting = false;
          // Extract error message from backend response
          this.statusModificationError = err?.error?.error || err?.error?.message || 'Failed to update reservation status';
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  // ── Material CRUD ────────────────────────────────

  openCreateMaterielModal(): void {
    this.materielForm = this.emptyMaterielForm();
    if (this.selectedCategory) {
      this.materielForm.categorieId = this.selectedCategory.id;
    }
    this.selectedMateriel = null;
    this.modalStep = 'create';
    this.showModal = true;
    this.errorMessage = '';
  }

  openEditMaterielModal(materiel: Materiel): void {
    this.selectedMateriel = materiel;
    this.materielForm = {
      nom: materiel.nom,
      reference: materiel.reference,
      description: materiel.description,
      prixUnitaire: materiel.prixUnitaire,
      quantiteTotale: materiel.quantiteTotale,
      status: materiel.status,
      categorieId: materiel.categorieId || 0
    };
    this.modalStep = 'edit';
    this.showModal = true;
    this.errorMessage = '';
  }

  createMateriel(): void {
    if (!this.validateMaterielForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.materielService.addMateriel(this.materielForm).subscribe({
      next: (newMateriel) => {
        this.materiels.push(newMateriel);
        this.filterMateriels();
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating material:', err);
        this.errorMessage = err.error?.message || 'Failed to create material.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateMateriel(): void {
    if (!this.validateMaterielForm()) {
      return;
    }

    if (!this.selectedMateriel?.id) {
      this.errorMessage = 'Material not selected.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const updateData: UpdateMaterielRequest = {
      ...this.materielForm,
      id: this.selectedMateriel.id
    };

    this.materielService.updateMateriel(this.selectedMateriel.id, updateData).subscribe({
      next: (updatedMateriel) => {
        const index = this.materiels.findIndex(m => m.id === updatedMateriel.id);
        if (index !== -1) {
          this.materiels[index] = updatedMateriel;
        }
        this.filterMateriels();
        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating material:', err);
        this.errorMessage = err.error?.message || 'Failed to update material.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteMateriel(id: number): void {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    this.materielService.deleteMateriel(id).subscribe({
      next: () => {
        this.materiels = this.materiels.filter(m => m.id !== id);
        this.filterMateriels();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting material:', err);
        alert('Failed to delete material.');
      }
    });
  }

  // ── Utilities ────────────────────────────────────

  private validateMaterielForm(): boolean {
    if (!this.materielForm.nom) {
      this.errorMessage = 'Material name is required.';
      return false;
    }
    if (!this.materielForm.reference) {
      this.errorMessage = 'Reference is required.';
      return false;
    }
    if (!this.materielForm.description) {
      this.errorMessage = 'Description is required.';
      return false;
    }
    if (this.materielForm.prixUnitaire <= 0) {
      this.errorMessage = 'Unit price must be greater than 0.';
      return false;
    }
    if (this.materielForm.quantiteTotale <= 0) {
      this.errorMessage = 'Total quantity must be greater than 0.';
      return false;
    }
    if (!this.materielForm.categorieId || this.materielForm.categorieId <= 0) {
      this.errorMessage = 'Category is required.';
      return false;
    }
    return true;
  }

  private emptyMaterielForm(): CreateMaterielRequest {
    return {
      nom: '',
      reference: '',
      description: '',
      prixUnitaire: 0,
      quantiteTotale: 0,
      status: MaterielStatus.ACTIVE,
      categorieId: 0
    };
  }

  closeModal(): void {
    this.showModal = false;
    this.modalStep = 'list';
    this.materielForm = this.emptyMaterielForm();
    this.selectedMateriel = null;
    this.selectedCategory_Edit = null;
    this.errorMessage = '';
  }
}
