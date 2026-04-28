import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, defaultIfEmpty, filter, from, map, Observable, of, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EMPTY_SENTIMENT_ANALYSIS,
  SentimentAnalysis,
  SentimentLabel,
  sentimentEmojiForLabel,
} from '../models/feedback-ai.model';
import {
  EMPTY_MODERATION_ANALYSIS,
  ModerationAnalysis,
  parseModerationApiResponse,
} from '../utils/feedback-moderation.util';

@Injectable({ providedIn: 'root' })
export class FeedbackAiService {
  private readonly moderationEndpoints = this.buildModerationEndpoints();
  private readonly sentimentEndpoints = this.buildSentimentEndpoints();

  constructor(private readonly http: HttpClient) {}

  analyzeModeration(comment: string): Observable<ModerationAnalysis> {
    const text = String(comment ?? '').trim();
    if (!text) {
      return of(EMPTY_MODERATION_ANALYSIS);
    }

    const payload = {
      text,
      comment: text,
      commentaire: text,
      message: text,
    };

    return this.postWithFallback(this.moderationEndpoints, payload).pipe(
      map((response) => parseModerationApiResponse(response)),
      catchError(() => of(EMPTY_MODERATION_ANALYSIS)),
    );
  }

  analyzeSentiment(comment: string, note: number | null | undefined): Observable<SentimentAnalysis> {
    const text = String(comment ?? '').trim();
    if (!text) {
      return of(this.buildFallbackSentiment(note));
    }

    const payload = {
      text,
      comment: text,
      commentaire: text,
      message: text,
      note,
    };

    return this.postWithFallback(this.sentimentEndpoints, payload).pipe(
      map((response) => this.parseSentimentResponse(response)),
      catchError(() => of(this.buildFallbackSentiment(note))),
    );
  }

  buildFallbackSentiment(note: number | null | undefined): SentimentAnalysis {
    const numeric = Number(note);

    let label: SentimentLabel = 'unknown';
    if (Number.isFinite(numeric)) {
      if (numeric >= 4) {
        label = 'positive';
      } else if (numeric < 2.5) {
        label = 'negative';
      } else {
        label = 'neutral';
      }
    }

    return {
      ...EMPTY_SENTIMENT_ANALYSIS,
      label,
      emoji: sentimentEmojiForLabel(label),
      source: 'fallback',
      confidence: Number.isFinite(numeric) ? 0.5 : 0,
    };
  }

  private parseSentimentResponse(payload: unknown): SentimentAnalysis {
    const data = (payload ?? {}) as Record<string, unknown>;
    const rawLabel = String(
      data['sentiment']
      ?? data['label']
      ?? data['sentimentLabel']
      ?? data['polarity']
      ?? data['className']
      ?? data['result']
      ?? '',
    )
      .trim()
      .toLowerCase();

    let label = this.normalizeSentimentLabel(rawLabel);

    const score = this.normalizeScore(
      data['score']
      ?? data['sentimentScore']
      ?? data['compound']
      ?? data['polarityScore']
      ?? data['value'],
    );
    const confidence = this.normalizeConfidence(
      data['confidence']
      ?? data['probability']
      ?? data['score'],
    );

    if (label === 'unknown' && score !== 0) {
      label = score > 0 ? 'positive' : 'negative';
    }

    return {
      label,
      score,
      confidence,
      emoji: sentimentEmojiForLabel(label),
      source: 'api',
      model: String(data['model'] ?? data['modelName'] ?? data['engine'] ?? '').trim() || null,
    };
  }

  private normalizeSentimentLabel(value: string): SentimentLabel {
    if (!value) {
      return 'unknown';
    }

    if (value.includes('pos') || value.includes('positive') || value.includes('joy') || value.includes('happy')) {
      return 'positive';
    }

    if (value.includes('neg') || value.includes('negative') || value.includes('anger') || value.includes('sad')) {
      return 'negative';
    }

    if (value.includes('neutral') || value.includes('mixed') || value.includes('mid')) {
      return 'neutral';
    }

    return 'unknown';
  }

  private normalizeScore(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(-1, Math.min(1, numeric));
  }

  private normalizeConfidence(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, numeric));
  }

  private postWithFallback(endpoints: string[], payload: unknown): Observable<unknown> {
    if (!endpoints.length) {
      return throwError(() => new Error('Aucun endpoint configure'));
    }

    return from(endpoints).pipe(
      concatMap((endpoint) =>
        this.http.post<unknown>(endpoint, payload).pipe(
          map((response) => ({ ok: true as const, response })),
          catchError(() => of({ ok: false as const, response: null })),
        )
      ),
      filter((entry): entry is { ok: true; response: unknown } => entry.ok),
      map((entry) => entry.response),
      take(1),
      defaultIfEmpty(null),
      concatMap((response) =>
        response === null
          ? throwError(() => new Error('Tous les endpoints IA ont echoue'))
          : of(response)
      ),
    );
  }

  private buildModerationEndpoints(): string[] {
    const aiBase = this.trimTrailingSlash(
      (environment as any).feedbackAiApiUrl
      || environment.recommendationApiUrl
      || environment.cancellationPredictionApiUrl
      || '',
    );
    const backendBase = this.trimTrailingSlash(environment.apiUrl || '');

    return this.uniqueEndpoints([
      this.joinUrl(aiBase, '/feedback/moderation'),
      this.joinUrl(aiBase, '/feedback/moderate'),
      this.joinUrl(aiBase, '/moderation'),
      this.joinUrl(aiBase, '/moderate'),
      this.joinUrl(backendBase, '/feedbacks/moderation/analyze'),
      this.joinUrl(backendBase, '/feedbacks/analyze'),
    ]);
  }

  private buildSentimentEndpoints(): string[] {
    const aiBase = this.trimTrailingSlash(
      (environment as any).feedbackAiApiUrl
      || environment.recommendationApiUrl
      || environment.cancellationPredictionApiUrl
      || '',
    );
    const backendBase = this.trimTrailingSlash(environment.apiUrl || '');

    return this.uniqueEndpoints([
      this.joinUrl(aiBase, '/feedback/sentiment'),
      this.joinUrl(aiBase, '/sentiment'),
      this.joinUrl(aiBase, '/sentiment/predict'),
      this.joinUrl(aiBase, '/predict-sentiment'),
      this.joinUrl(backendBase, '/feedbacks/sentiment'),
      this.joinUrl(backendBase, '/feedbacks/analyze-sentiment'),
    ]);
  }

  private uniqueEndpoints(values: Array<string | null>): string[] {
    const urls = values.filter((value): value is string => Boolean(value && value.startsWith('http')));
    return [...new Set(urls)];
  }

  private trimTrailingSlash(value: string): string {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  private joinUrl(base: string, path: string): string | null {
    if (!base) {
      return null;
    }
    return `${base}${path}`;
  }
}
