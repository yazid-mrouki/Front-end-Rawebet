// ── Category Material (CategorieMateriel) ────────────────────────────

export interface CategorieMateriel {
  id: number;
  nom: string;
  description: string;
  materiels?: Materiel[];
}

export interface CreateCategorieMaterielRequest {
  nom: string;
  description: string;
}

export interface UpdateCategorieMaterielRequest {
  id?: number;
  nom: string;
  description: string;
}

export interface CategorieMaterielResponseDTO {
  id: number;
  nom: string;
  description: string;
}

// Re-export Materiel for convenience
export interface Materiel {
  id: number;
  nom: string;
  description: string;
  reference: string;
  quantiteDisponible: number;
  prixUnitaire: number;
  disponible: boolean;
  status: string;
  categorieId?: number;
  categorieNom?: string;
}
