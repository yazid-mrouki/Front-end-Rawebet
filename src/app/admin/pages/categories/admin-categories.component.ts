import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CategorieMaterielService } from '../../../features/material/services/category-materiel.service';
import { CategorieMateriel, CreateCategorieMaterielRequest, UpdateCategorieMaterielRequest } from '../../../features/material/models/category-materiel.model';

type ModalStep = 'list' | 'create' | 'edit';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html'
})
export class AdminCategoriesComponent implements OnInit, OnDestroy {

  // ── List management ──────────────────────────────
  categories: CategorieMateriel[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';

  // ── Modal state ──────────────────────────────────
  showModal = false;
  modalStep: ModalStep = 'list';
  isSubmitting = false;
  errorMessage = '';
  selectedCategorie: CategorieMateriel | null = null;

  // ── Form state ───────────────────────────────────
  form: CreateCategorieMaterielRequest = this.emptyForm();

  // ── Search subject ───────────────────────────────
  searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  constructor(
    private categorieService: CategorieMaterielService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
  loadCategories(): void {
    this.isLoading = true;
    this.categorieService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load categories.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Filtering ────────────────────────────────────
  get filteredCategories(): CategorieMateriel[] {
    return this.categories.filter(cat =>
      cat.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  // ── Modal Management ─────────────────────────────
  openCreateModal(): void {
    this.form = this.emptyForm();
    this.selectedCategorie = null;
    this.modalStep = 'create';
    this.showModal = true;
    this.errorMessage = '';
  }

  openEditModal(categorie: CategorieMateriel): void {
    this.selectedCategorie = categorie;
    this.form = {
      nom: categorie.nom,
      description: categorie.description
    };
    this.modalStep = 'edit';
    this.showModal = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.modalStep = 'list';
    this.form = this.emptyForm();
    this.selectedCategorie = null;
    this.errorMessage = '';
  }

  // ── Form Submission ──────────────────────────────
  submitForm(): void {
    if (!this.validateForm()) {
      return; // Error message is already set in validateForm()
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData: CreateCategorieMaterielRequest = {
      nom: this.form.nom,
      description: this.form.description
    };

    if (this.modalStep === 'create') {
      this.categorieService.addCategorie(formData).subscribe({
        next: (newCategorie) => {
          this.categories.push(newCategorie as CategorieMateriel);
          this.closeModal();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error creating category:', err);
          this.errorMessage = err.error?.message || err.error?.error || 'Failed to create category.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else if (this.modalStep === 'edit' && this.selectedCategorie) {
      const updateData: UpdateCategorieMaterielRequest = {
        ...formData,
        id: this.selectedCategorie.id
      };

      this.categorieService.updateCategorie(this.selectedCategorie.id, updateData).subscribe({
        next: (updatedCategorie) => {
          const index = this.categories.findIndex(c => c.id === this.selectedCategorie!.id);
          if (index !== -1) {
            this.categories[index] = {
              ...this.categories[index],
              ...updatedCategorie
            };
          }
          this.closeModal();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error updating category:', err);
          this.errorMessage = err.error?.message || err.error?.error || 'Failed to update category.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ── Delete ───────────────────────────────────────
  deleteCategorie(categorie: CategorieMateriel): void {
    if (confirm(`Are you sure you want to delete "${categorie.nom}"?`)) {
      this.categorieService.deleteCategorie(categorie.id).subscribe({
        next: () => {
          this.categories = this.categories.filter(c => c.id !== categorie.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting category:', err);
          alert('Failed to delete category.');
        }
      });
    }
  }

  // ── Helpers ──────────────────────────────────────
  private validateForm(): boolean {
    if (!this.form.nom?.trim()) {
      this.errorMessage = 'Category name is required.';
      return false;
    }
    if (!this.form.description?.trim()) {
      this.errorMessage = 'Description is required.';
      return false;
    }
    return true;
  }

  private emptyForm(): CreateCategorieMaterielRequest {
    return {
      nom: '',
      description: ''
    };
  }
}
