import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterielService } from '../../features/material/services/materiel.service';
import { CategorieMaterielService } from '../../features/material/services/category-materiel.service';
import { Materiel, MaterielStatus } from '../../features/material/models/materiel.model';
import { CategorieMateriel } from '../../features/material/models/category-materiel.model';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './materials.component.html',
  styleUrl: './materials.component.scss'
})
export class MaterialsComponent implements OnInit {
  categories: CategorieMateriel[] = [];
  materials: Materiel[] = [];
  isLoading = true;
  isLoadingMaterials = false;
  error = '';

  selectedCategory: CategorieMateriel | null = null;
  showMaterialsView = false;

  constructor(
    private materielService: MaterielService,
    private categorieMaterielService: CategorieMaterielService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.error = '';
    console.log('Loading material categories...');

    this.categorieMaterielService.getAllCategories().subscribe({
      next: (data) => {
        console.log('✓ Categories loaded:', data);
        setTimeout(() => {
          this.categories = data;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          console.log('✓ UI updated - categories:', this.categories.length);
        }, 0);
      },
      error: (err) => {
        console.error('✗ Error loading categories:', err);
        setTimeout(() => {
          this.error = `Failed to load categories: ${err.message || err.statusText || 'Unknown error'}`;
          this.isLoading = false;
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
          console.log('✓ Filtered materials loaded:', this.materials.length);
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

  goBack(): void {
    this.showMaterialsView = false;
    this.selectedCategory = null;
    this.materials = [];
  }
}
