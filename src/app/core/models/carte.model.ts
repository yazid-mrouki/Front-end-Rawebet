export type Level = 'SILVER' | 'GOLD' | 'VIP';
export type RewardType = 'CINEMA_FREE' | 'EVENT_DISCOUNT' | 'FORMATION_DISCOUNT';

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
  'totalPointsDistribués': number;
}
export interface TopClientResponse {
  nom: string;
  email: string;
  points: number;
  level: Level;
}
