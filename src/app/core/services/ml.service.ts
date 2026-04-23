import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChurnPrediction {
  churn: number;
  churn_label: string;
  probability: number;
  risk_level: string;
  message: string;
}

export interface AnomalyPrediction {
  is_anomaly: number;
  anomaly_label: string;
  probability: number;
  isolation_score: number;
  consensus_anomaly: boolean;
  recommended_action: string;
}

export interface NextLevelPrediction {
  current_level: string;
  predicted_level: string;
  will_upgrade: boolean;
  upgrade_message: string;
  points_for_gold: number;
  points_for_vip: number;
  probabilities: { SILVER: number; GOLD: number; VIP: number };
}

export interface RewardPrediction {
  best_reward: string;
  can_redeem: boolean;
  points_required: number;
  points_available: number;
  top_rewards: Array<{ reward: string; probability: number; cost: number; redeemable: boolean }>;
}

export interface AllPredictions {
  churn: ChurnPrediction;
  anomaly: AnomalyPrediction;
  next_level: NextLevelPrediction;
  reward: RewardPrediction;
}

export interface ClientScanRow {
  userId: number;
  nom: string;
  email: string;
  churnProba: number;
  churnLabel: string;
  churnRisk: string;
  anomalyProba: number;
  anomalyLabel: string;
  anomalyAction: string;
  currentLevel: string;
  nextLevel: string;
  willUpgrade: boolean;
  bestReward: string;
  canRedeem: boolean;
}

export interface AutoActionResult {
  userId: number;
  actions: string[];
  churnRisk: string;
  anomalyScore: number;
}

@Injectable({ providedIn: 'root' })
export class MlService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  predictAll(userId: number): Observable<AllPredictions | null> {
    return this.http
      .get<AllPredictions>(`${this.api}/ml/predict/all/${userId}`)
      .pipe(catchError(() => of(null)));
  }

  predictChurn(userId: number): Observable<ChurnPrediction | null> {
    return this.http
      .get<ChurnPrediction>(`${this.api}/ml/predict/churn/${userId}`)
      .pipe(catchError(() => of(null)));
  }

  predictAnomaly(userId: number): Observable<AnomalyPrediction | null> {
    return this.http
      .get<AnomalyPrediction>(`${this.api}/ml/predict/anomaly/${userId}`)
      .pipe(catchError(() => of(null)));
  }

  predictNextLevel(userId: number): Observable<NextLevelPrediction | null> {
    return this.http
      .get<NextLevelPrediction>(`${this.api}/ml/predict/next-level/${userId}`)
      .pipe(catchError(() => of(null)));
  }

  predictReward(userId: number): Observable<RewardPrediction | null> {
    return this.http
      .get<RewardPrediction>(`${this.api}/ml/predict/reward/${userId}`)
      .pipe(catchError(() => of(null)));
  }

  // ── NOUVEAU — Scan global de tous les clients ─────────────────────────
  scanAllClients(): Observable<ClientScanRow[]> {
    return this.http.get<ClientScanRow[]>(`${this.api}/ml/scan/all`).pipe(catchError(() => of([])));
  }

  // ── NOUVEAU — Action automatique ──────────────────────────────────────
  autoAction(userId: number): Observable<AutoActionResult | null> {
    return this.http
      .post<AutoActionResult>(`${this.api}/ml/auto-action/${userId}`, {})
      .pipe(catchError(() => of(null)));
  }

  mlHealth(): Observable<any> {
    return this.http
      .get(`${this.api}/ml/health`, { responseType: 'text' })
      .pipe(catchError(() => of(null)));
  }
}
