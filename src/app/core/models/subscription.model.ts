export interface Abonnement {
  id: number;
  nom?: string;
  name?: string;
  description?: string;
  price?: number;
  duration?: string;
  features?: string[];
}

export type SubscriptionStatus = 'ACTIVE' | 'QUEUED' | 'EXPIRED' | 'EXHAUSTED';

export type SubscribeResultType = 'ACTIVATED_NOW' | 'QUEUED_NEXT';

export interface UserAbonnement {
  id?: number;
  userId?: number;
  userAbonnementId?: number;
  abonnementId?: number;
  startDate?: string;
  dateDebut?: string;
  expiryDate?: string;
  dateFin?: string;
  expirationDate?: string;
  remainingTickets?: number;
  ticketsRemaining?: number;
  ticketsRestants?: number;
  ticketCount?: number;
  status?: string;
  abonnement?: Abonnement;
  abonnementName?: string;
  abonnementType?: string;
}

export interface SubscriptionDto {
  subscriptionId?: number;
  abonnementId?: number;
  abonnementType?: string;
  abonnementName?: string;
  dateDebut?: string;
  dateFin?: string;
  ticketsRestants?: number;
  isIllimited?: boolean;
  status?: SubscriptionStatus;
}

export interface TimelineResponse {
  userId?: number;
  currentSubscription?: SubscriptionDto | null;
  nextSubscription?: SubscriptionDto | null;
  queuedSubscriptions?: SubscriptionDto[];
  history?: SubscriptionDto[];
}

export interface SubscribeResponse {
  userId?: number;
  subscriptionId?: number;
  abonnementId?: number;
  abonnementType?: string;
  dateDebut?: string;
  dateFin?: string;
  ticketsRestants?: number;
  status?: SubscriptionStatus;
  resultType?: SubscribeResultType;
  message?: string;
}

export interface ScanResponse {
  message?: string;
  ticketsRemaining?: number;
  userName?: string;
  error?: string;
}
