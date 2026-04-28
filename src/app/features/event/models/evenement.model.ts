// ─────────────────────────────────────────────────────────
// Event (Événement) Models
// ─────────────────────────────────────────────────────────

export enum EvenementStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED'
}

export enum TypeCategorie {
  THEATRE = 'THEATRE',
  DANSE = 'DANSE',
  MUSIQUE = 'MUSIQUE',
  EXPOSITION = 'EXPOSITION',
  CONFERENCE = 'CONFERENCE',
  ATELIER = 'ATELIER',
  FESTIVAL = 'FESTIVAL',
  CONCERT = 'CONCERT',
  SPECTACLE = 'SPECTACLE',
  AUTRE = 'AUTRE'
}

export interface Evenement {
  id: number;
  titre: string;
  description: string;
  dateDebut: string; // LocalDateTime ISO format
  dateFin: string;   // LocalDateTime ISO format
  nombreDePlaces: number;
  placesRestantes?: number;
  status: EvenementStatus;
  categorie: TypeCategorie;
  prixUnitaire: number;
  salleId?: number;
  salleNom?: string;
  salleType?: string;
  materiels?: EvenementMateriel[];
  reservations?: any[];
}

export interface EvenementMateriel {
  id: number;
  quantite: number;
  evenementId: number;
  evenementTitre: string;
  materielId: number;
  materielNom: string;
  materielReference: string;
}

export interface CreateEvenementRequest {
  titre: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  nombreDePlaces: number;
  salleId: number;
  status: EvenementStatus;
  categorie: TypeCategorie;
  prixUnitaire: number;
}

export interface UpdateEvenementRequest extends CreateEvenementRequest {
  id: number;
}

export interface EvenementMaterielRequestDTO {
  evenementId: number;
  materielId: number;
  quantite: number;
}

export interface EvenementMaterielResponseDTO extends EvenementMateriel {}
