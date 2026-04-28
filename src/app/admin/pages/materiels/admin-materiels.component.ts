import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MaterielService } from '../../../features/material/services/materiel.service';
import { CategorieMaterielService } from '../../../features/material/services/category-materiel.service';
import { Materiel, CreateMaterielRequest, UpdateMaterielRequest, MaterielStatus } from '../../../features/material/models/materiel.model';
import { CategorieMateriel } from '../../../features/material/models/category-materiel.model';

type ModalStep = 'list' | 'create' | 'edit';

interface AIRiskAssessment {
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  emoji: string;
  color: string;
  message: string;
  recommendation: string;
}

@Component({
  selector: 'app-admin-materiels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-materiels.component.html'
})
export class AdminMaterielsComponent implements OnInit, OnDestroy {

  // ── List management ──────────────────────────────
  materiels: Materiel[] = [];
  categories: CategorieMateriel[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';
  selectedStatusFilter = 'all';

  // ── Modal state ──────────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'list';
  isSubmitting = false;
  errorMessage = '';
  selectedMateriel: Materiel | null = null;

  // ── Form state ───────────────────────────────────
  form: CreateMaterielRequest = this.emptyForm();

  // ── Search subject ───────────────────────────────
  searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  // ── Status enum ──────────────────────────────────
  statusOptions = Object.values(MaterielStatus);

  // ── AI Risk Modal ────────────────────────────────
  showAIRiskModal = false;
  selectedMaterielForAI: Materiel | null = null;
  selectedAIRisk: AIRiskAssessment | null = null;

  constructor(
    private materielService: MaterielService,
    private categorieService: CategorieMaterielService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMateriels();
    this.loadCategories();

    // Search with debounce
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ── Loading ──────────────────────────────────────
  loadMateriels(): void {
    this.isLoading = true;
    this.materielService.getAllMateriels().subscribe({
      next: (data) => {
        this.materiels = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load materials.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadCategories(): void {
    this.categorieService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.cdr.detectChanges();
      },
      error: () => {
        console.error('Failed to load categories.');
      }
    });
  }

  // ── Filtering ────────────────────────────────────
  get filteredMateriels(): Materiel[] {
    return this.materiels.filter(mat => {
      const matchSearch = mat.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         mat.reference.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.selectedStatusFilter === 'all' || mat.status === this.selectedStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  // ── Modal Management ─────────────────────────────
  openCreateModal(): void {
    this.form = this.emptyForm();
    this.selectedMateriel = null;
    this.modalStep = 'create';
    this.showModal = true;
    this.errorMessage = '';
  }

  openEditModal(materiel: Materiel): void {
    this.selectedMateriel = materiel;
    this.form = {
      nom: materiel.nom,
      description: materiel.description,
      reference: materiel.reference,
      quantiteTotale: materiel.quantiteTotale,
      prixUnitaire: materiel.prixUnitaire,
      status: materiel.status as MaterielStatus,
      categorieId: materiel.categorieId || 0
    };
    this.modalStep = 'edit';
    this.showModal = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.modalStep = 'list';
    this.form = this.emptyForm();
    this.selectedMateriel = null;
    this.errorMessage = '';
  }

  // ── Form Submission ──────────────────────────────
  submitForm(): void {
    if (!this.validateForm()) {
      return; // Error message is already set in validateForm()
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData: CreateMaterielRequest = {
      nom: this.form.nom,
      description: this.form.description,
      reference: this.form.reference,
      quantiteTotale: this.form.quantiteTotale,
      prixUnitaire: this.form.prixUnitaire,
      status: this.form.status as MaterielStatus,
      categorieId: this.form.categorieId
    };

    if (this.modalStep === 'create') {
      this.materielService.addMateriel(formData).subscribe({
        next: (newMateriel) => {
          this.materiels.push(newMateriel as Materiel);
          this.closeModal();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error creating material:', err);
          this.errorMessage = err.error?.message || err.error?.error || 'Failed to create material.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else if (this.modalStep === 'edit' && this.selectedMateriel) {
      const updateData: UpdateMaterielRequest = {
        ...formData,
        id: this.selectedMateriel.id
      };

      this.materielService.updateMateriel(this.selectedMateriel.id, updateData).subscribe({
        next: (updatedMateriel) => {
          const index = this.materiels.findIndex(m => m.id === this.selectedMateriel!.id);
          if (index !== -1) {
            this.materiels[index] = {
              ...this.materiels[index],
              ...updatedMateriel
            };
          }
          this.closeModal();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error updating material:', err);
          this.errorMessage = err.error?.message || err.error?.error || 'Failed to update material.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ── Delete ───────────────────────────────────────
  deleteMateriel(materiel: Materiel): void {
    if (confirm(`Are you sure you want to delete "${materiel.nom}"?`)) {
      this.materielService.deleteMateriel(materiel.id).subscribe({
        next: () => {
          this.materiels = this.materiels.filter(m => m.id !== materiel.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting material:', err);
          alert('Failed to delete material.');
        }
      });
    }
  }

  // ── AI Risk Assessment ──────────────────────────
  getAIRiskForMaterial(material: Materiel): AIRiskAssessment {
    // Simple AI risk assessment based on status and quantity
    if (material.status === 'DAMAGED') {
      return {
        level: 'HIGH',
        emoji: '🔴',
        color: 'bg-red-100 text-red-700',
        message: 'High risk detected. This material is currently damaged.',
        recommendation: 'Immediate action required: Schedule maintenance or replacement.'
      };
    }
    if (material.status === 'MAINTENANCE') {
      return {
        level: 'MEDIUM',
        emoji: '🟡',
        color: 'bg-yellow-100 text-yellow-700',
        message: 'Medium risk detected. This material is under maintenance.',
        recommendation: 'Monitor maintenance progress and schedule completion.'
      };
    }
    if (material.quantiteTotale && material.quantiteTotale < 3) {
      return {
        level: 'MEDIUM',
        emoji: '🟡',
        color: 'bg-yellow-100 text-yellow-700',
        message: 'Medium risk detected. Low quantity available.',
        recommendation: 'Consider restocking this material soon.'
      };
    }
    return {
      level: 'LOW',
      emoji: '🟢',
      color: 'bg-green-100 text-green-700',
      message: 'Low risk detected. Material is in good condition.',
      recommendation: 'Continue monitoring and maintain regular usage logs.'
    };
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

  // ── Helpers ──────────────────────────────────────
  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-600';
      case 'MAINTENANCE': return 'bg-yellow-50 text-yellow-600';
      case 'DAMAGED': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getCategorieName(categorieId?: number): string {
    return this.categories.find(c => c.id === categorieId)?.nom || 'Unknown';
  }

  onStatusFilterChange(): void {
    this.cdr.detectChanges();
  }

  private validateForm(): boolean {
    if (!this.form.nom?.trim()) {
      this.errorMessage = 'Material name is required.';
      return false;
    }
    if (!this.form.description?.trim()) {
      this.errorMessage = 'Description is required.';
      return false;
    }
    if (!this.form.reference?.trim()) {
      this.errorMessage = 'Reference is required.';
      return false;
    }
    if (this.form.quantiteTotale <= 0) {
      this.errorMessage = 'Total quantity must be greater than 0';
      return false;
    }
    if (this.form.prixUnitaire < 0) {
      this.errorMessage = 'Unit price cannot be negative.';
      return false;
    }
    if (this.form.categorieId <= 0) {
      this.errorMessage = 'Please select a category.';
      return false;
    }
    if (!this.form.status) {
      this.errorMessage = 'Status is required.';
      return false;
    }
    return true;
  }

  private emptyForm(): CreateMaterielRequest {
    return {
      nom: '',
      description: '',
      reference: '',
      quantiteTotale: 0,
      prixUnitaire: 0,
      status: MaterielStatus.ACTIVE,
      categorieId: 0
    };
  }
}
