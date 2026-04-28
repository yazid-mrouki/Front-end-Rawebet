// ─────────────────────────────────────────────────────────
// Event Space (Salle d'Événement) Models
// ─────────────────────────────────────────────────────────

export enum SalleType {
  INTERIEUR = 'INTERIEUR',
  EXTERIEUR = 'EXTERIEUR'
}

export enum SalleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface EventSpace {
  id: number;
  nom: string;
  capacite: number;
  type: SalleType;
  status: SalleStatus;
  evenements?: any[];
}

export interface CreateEventSpaceRequest {
  nom: string;
  capacite: number;
  type: SalleType;
  status: SalleStatus;
}

export interface UpdateEventSpaceRequest extends CreateEventSpaceRequest {
  id: number;
}
