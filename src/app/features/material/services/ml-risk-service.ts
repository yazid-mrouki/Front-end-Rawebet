import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * ML Risk Prediction Models
 */
export interface MaterielWithRisk {
  id: number;
  nom: string;
  reference?: string;
  riskLevel: 'AT_RISK' | 'MODERATE_RISK' | 'SAFE' | 'INSUFFICIENT_DATA' | 'UNKNOWN' | 'UNAVAILABLE';
  riskBadge: string; // e.g., "🔴 AT_RISK (63.7%)"
  damageProbability: number; // 0-1
  damageProbabilityPct: string; // e.g., "63.7%"
  riskMessage: string;
  needsMaintenance: boolean;
  newMaterial: boolean;
  mlAvailable: boolean;
}

export interface BatchPredictionRequest {
  materielNames: string[];
}

export interface BatchPredictionResponse {
  predictions: Array<{
    name: string;
    riskLevel: string;
    damageProbability: number;
    timestamp: string;
  }>;
  totalCount: number;
  timestamp: string;
}

export interface RiskSummary {
  totalMaterials: number;
  atRisk: number;
  moderateRisk: number;
  safe: number;
  insufficientData: number;
  mlAvailable: boolean;
  lastUpdate: Date;
}

export interface MaterielRiskStats {
  materielId: number;
  materielNom: string;
  riskLevel: string;
  damageProbability: number;
  trend?: 'increasing' | 'stable' | 'decreasing';
  lastChecked: Date;
}

/**
 * Service for ML Risk Prediction Integration
 * Connects to Flask ML API at localhost:5000
 */
@Injectable({ providedIn: 'root' })
export class MLRiskService {

  // Flask ML API endpoint (from Python environment)
  private mlApiUrl = 'http://localhost:5000';

  // Spring Boot endpoint (fallback to get data from Java backend)
  private springApiUrl = `${environment.apiUrl}/api/materiel`;

  // Risk cache with auto-refresh
  private riskCache = new BehaviorSubject<Map<number, MaterielWithRisk>>(new Map());
  private riskSummary$ = new BehaviorSubject<RiskSummary | null>(null);

  // Auto-refresh interval (30 seconds)
  private autoRefreshInterval = 30000;
  private autoRefresh$ = interval(this.autoRefreshInterval);

  constructor(private http: HttpClient) {
    this.initAutoRefresh();
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // SINGLE MATERIAL PREDICTION
  // ══════════════════════════════════════════════════════════════════════════════════

  /**
   * Get risk prediction for a single material by name
   * Falls back to Spring Boot API if Flask is unavailable
   */
  getMaterielRisk(materielName: string): Observable<MaterielWithRisk> {
    // Try Flask API first
    return this.http.post<MaterielWithRisk>(
      `${this.mlApiUrl}/predict/materiel/${materielName}`,
      {}
    ).pipe(
      tap(risk => this.cacheRiskData(risk)),
      catchError(err => {
        console.warn(`⚠️ Flask ML API unavailable for ${materielName}, falling back to Spring Boot`);
        // Fall back to Spring Boot endpoint if Flask is down
        return this.http.get<MaterielWithRisk>(
          `${this.springApiUrl}/risk/${materielName}`
        ).pipe(
          catchError(() => of(this.createUnavailableResponse(materielName)))
        );
      })
    );
  }

  /**
   * Get risk prediction for a single material by ID
   */
  getMaterielRiskById(id: number, materielName: string): Observable<MaterielWithRisk> {
    return this.getMaterielRisk(materielName);
  }

  /**
   * Get risk predictions for multiple materials (batch)
   */
  getBatchMaterielRisks(materielNames: string[]): Observable<MaterielWithRisk[]> {
    const request: BatchPredictionRequest = { materielNames };

    return this.http.post<BatchPredictionResponse>(
      `${this.mlApiUrl}/predict/batch`,
      request
    ).pipe(
      map(response => response.predictions.map((pred: any) => ({
        nom: pred.name,
        riskLevel: pred.riskLevel,
        damageProbability: pred.damageProbability,
        damageProbabilityPct: (pred.damageProbability * 100).toFixed(1) + '%',
        riskBadge: this.buildRiskBadge(pred.riskLevel, pred.damageProbability),
        riskMessage: this.buildRiskMessage(pred.riskLevel),
        needsMaintenance: pred.riskLevel === 'AT_RISK' || pred.riskLevel === 'MODERATE_RISK',
        newMaterial: pred.riskLevel === 'INSUFFICIENT_DATA',
        mlAvailable: true,
        id: 0, // Will be populated by caller
        reference: ''
      } as MaterielWithRisk))),
      tap(risks => {
        risks.forEach(risk => this.cacheRiskData(risk));
      }),
      catchError(err => {
        console.error('Batch prediction failed:', err);
        return of([]);
      })
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // MATERIAL FILTERING BY RISK
  // ══════════════════════════════════════════════════════════════════════════════════

  /**
   * Get all materials that need maintenance (AT_RISK or MODERATE_RISK)
   */
  getMaterialsNeedingMaintenance(): Observable<MaterielWithRisk[]> {
    return this.http.get<MaterielWithRisk[]>(
      `${this.springApiUrl}/maintenance-needed`
    ).pipe(
      tap(materials => {
        materials.forEach(m => this.cacheRiskData(m));
      }),
      catchError(err => {
        console.error('Failed to fetch materials needing maintenance:', err);
        return of([]);
      })
    );
  }

  /**
   * Get all safe materials (low risk)
   */
  getSafeMaterials(): Observable<MaterielWithRisk[]> {
    return this.http.get<MaterielWithRisk[]>(
      `${this.springApiUrl}/safe`
    ).pipe(
      tap(materials => {
        materials.forEach(m => this.cacheRiskData(m));
      }),
      catchError(err => {
        console.error('Failed to fetch safe materials:', err);
        return of([]);
      })
    );
  }

  /**
   * Get all new materials (insufficient data)
   */
  getNewMaterials(): Observable<MaterielWithRisk[]> {
    return this.http.get<MaterielWithRisk[]>(
      `${this.springApiUrl}/new-materials`
    ).pipe(
      tap(materials => {
        materials.forEach(m => this.cacheRiskData(m));
      }),
      catchError(err => {
        console.error('Failed to fetch new materials:', err);
        return of([]);
      })
    );
  }

  /**
   * Get all materials with risk (high risk)
   */
  getHighRiskMaterials(): Observable<MaterielWithRisk[]> {
    return this.http.get<MaterielWithRisk[]>(
      `${this.springApiUrl}/high-risk`
    ).pipe(
      tap(materials => {
        materials.forEach(m => this.cacheRiskData(m));
      }),
      catchError(err => {
        console.error('Failed to fetch high risk materials:', err);
        return of([]);
      })
    );
  }

  /**
   * Get all materials with risk assessment
   */
  getAllMaterialsWithRisk(): Observable<MaterielWithRisk[]> {
    return this.http.get<MaterielWithRisk[]>(
      `${this.springApiUrl}/with-risk`
    ).pipe(
      tap(materials => {
        const cache = new Map(this.riskCache.value);
        materials.forEach(m => {
          cache.set(m.id, m);
        });
        this.riskCache.next(cache);
        this.updateRiskSummary(materials);
      }),
      catchError(err => {
        console.error('Failed to fetch materials with risk:', err);
        return of([]);
      })
    );
  }

  /**
   * Get risk summary (counts by level)
   */
  getRiskSummary(): Observable<RiskSummary> {
    return this.http.get<RiskSummary>(
      `${this.springApiUrl}/risk-summary`
    ).pipe(
      tap(summary => {
        this.riskSummary$.next(summary);
      }),
      catchError(err => {
        console.error('Failed to fetch risk summary:', err);
        // Return empty summary if API fails
        return of({
          totalMaterials: 0,
          atRisk: 0,
          moderateRisk: 0,
          safe: 0,
          insufficientData: 0,
          mlAvailable: false,
          lastUpdate: new Date()
        });
      })
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // CACHING & OBSERVABLES
  // ══════════════════════════════════════════════════════════════════════════════════

  /**
   * Get cached risk data for a material
   */
  getCachedRisk(id: number): MaterielWithRisk | undefined {
    return this.riskCache.value.get(id);
  }

  /**
   * Get risk cache as observable
   */
  getRiskCache(): Observable<Map<number, MaterielWithRisk>> {
    return this.riskCache.asObservable();
  }

  /**
   * Get risk summary as observable
   */
  getRiskSummary$(): Observable<RiskSummary | null> {
    return this.riskSummary$.asObservable();
  }

  /**
   * Clear cache (force refresh)
   */
  clearCache(): void {
    this.riskCache.next(new Map());
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // AUTO-REFRESH & UTILITIES
  // ══════════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize auto-refresh of risk data
   * Refreshes every 30 seconds by default
   */
  private initAutoRefresh(): void {
    this.autoRefresh$.pipe(
      switchMap(() => this.getAllMaterialsWithRisk())
    ).subscribe({
      next: () => {
        console.log('✅ Risk cache auto-refreshed');
      },
      error: (err) => {
        console.warn('⚠️ Risk cache auto-refresh failed:', err);
      }
    });
  }

  /**
   * Manually refresh all risk data
   */
  refreshAllRisks(): Observable<MaterielWithRisk[]> {
    this.clearCache();
    return this.getAllMaterialsWithRisk();
  }

  /**
   * Check if ML API is available
   */
  checkMLApiHealth(): Observable<boolean> {
    return this.http.get<any>(`${this.mlApiUrl}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ══════════════════════════════════════════════════════════════════════════════════

  /**
   * Build risk badge string (e.g., "🔴 AT_RISK (63.7%)")
   */
  private buildRiskBadge(riskLevel: string, probability: number): string {
    const pct = (probability * 100).toFixed(1);
    const emoji = this.getRiskEmoji(riskLevel);
    return `${emoji} ${riskLevel} (${pct}%)`;
  }

  /**
   * Get emoji for risk level
   */
  getRiskEmoji(riskLevel: string): string {
    switch (riskLevel) {
      case 'AT_RISK': return '🔴';
      case 'MODERATE_RISK': return '🟡';
      case 'SAFE': return '🟢';
      case 'INSUFFICIENT_DATA': return '🔵';
      case 'UNKNOWN': return '⚪';
      case 'UNAVAILABLE': return '⚠️';
      default: return '❓';
    }
  }

  /**
   * Get risk color class for styling
   */
  getRiskColorClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'AT_RISK': return 'bg-red-100 text-red-700';
      case 'MODERATE_RISK': return 'bg-yellow-100 text-yellow-700';
      case 'SAFE': return 'bg-green-100 text-green-700';
      case 'INSUFFICIENT_DATA': return 'bg-blue-100 text-blue-700';
      case 'UNKNOWN': return 'bg-gray-100 text-gray-700';
      case 'UNAVAILABLE': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  /**
   * Build risk message
   */
  private buildRiskMessage(riskLevel: string): string {
    switch (riskLevel) {
      case 'AT_RISK':
        return '⚠️ HIGH RISK — immediate maintenance recommended.';
      case 'MODERATE_RISK':
        return '⚠️ MODERATE RISK — consider scheduling a maintenance check soon.';
      case 'SAFE':
        return 'ℹ️ LOW RISK — monitor usage, no immediate action needed.';
      case 'INSUFFICIENT_DATA':
        return 'ℹ️ NEW MATERIAL — no prediction data available yet. Wait for usage history.';
      case 'UNKNOWN':
        return 'ℹ️ Unknown risk status.';
      case 'UNAVAILABLE':
        return '⚠️ ML API currently unavailable — cannot assess risk.';
      default:
        return '';
    }
  }

  /**
   * Cache risk data
   */
  private cacheRiskData(risk: MaterielWithRisk): void {
    const cache = new Map(this.riskCache.value);
    cache.set(risk.id, risk);
    this.riskCache.next(cache);
  }

  /**
   * Update risk summary statistics
   */
  private updateRiskSummary(materials: MaterielWithRisk[]): void {
    const summary: RiskSummary = {
      totalMaterials: materials.length,
      atRisk: materials.filter(m => m.riskLevel === 'AT_RISK').length,
      moderateRisk: materials.filter(m => m.riskLevel === 'MODERATE_RISK').length,
      safe: materials.filter(m => m.riskLevel === 'SAFE').length,
      insufficientData: materials.filter(m => m.riskLevel === 'INSUFFICIENT_DATA').length,
      mlAvailable: materials.some(m => m.mlAvailable),
      lastUpdate: new Date()
    };
    this.riskSummary$.next(summary);
  }

  /**
   * Create unavailable response when API fails
   */
  private createUnavailableResponse(materielName: string): MaterielWithRisk {
    return {
      id: 0,
      nom: materielName,
      riskLevel: 'UNAVAILABLE',
      riskBadge: '⚠️ UNAVAILABLE (API error)',
      damageProbability: 0,
      damageProbabilityPct: 'N/A',
      riskMessage: '⚠️ ML API currently unavailable — cannot assess risk.',
      needsMaintenance: false,
      newMaterial: false,
      mlAvailable: false
    };
  }

  /**
   * Get risk level color for badges
   */
  getRiskBadgeColor(riskLevel: string): { bg: string; text: string } {
    switch (riskLevel) {
      case 'AT_RISK':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      case 'MODERATE_RISK':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 'SAFE':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'INSUFFICIENT_DATA':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  }

  /**
   * Format damage probability as percentage
   */
  formatDamageProbability(probability: number): string {
    return (probability * 100).toFixed(1) + '%';
  }
}
