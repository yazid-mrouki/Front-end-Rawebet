export type Level = 'SILVER' | 'GOLD' | 'VIP';
export type RewardType = 'CINEMA_FREE' | 'EVENT_DISCOUNT' | 'CLUB_DISCOUNT';

export interface CarteFideliteResponse {
  points: number;
  dateExpiration: string;
  level: Level;
}

export interface FidelityHistoryResponse {
  action: string;
  points: number;
  createdAt: string;
}

export interface RewardResponse {
  reward: string;
  pointsDepensés: number;
  pointsRestants: number;
  message: string;
}

export interface CarteStatsResponse {
  totalClients: number;
  totalSilver: number;
  totalGold: number;
  totalVip: number;
  totalPointsDistribues: number;
}

export interface TopClientResponse {
  nom: string;
  email: string;
  points: number;
  level: Level;
}

export interface LoyaltyDashboardResponse {
  carte: CarteFideliteResponse;
  history: FidelityHistoryResponse[];
  rewards: RewardType[];
}

export interface LoyaltyAdminOverviewResponse {
  stats: CarteStatsResponse;
  topClients: TopClientResponse[];
}

export interface TransferRecipientResponse {
  id: number;
  nom: string;
  email: string;
}