export interface ModerationMatch {
  word: string;
  occurrences: number;
}

export interface ModerationAnalysis {
  hasBadWords: boolean;
  score: number;
  severity: 'clean' | 'warning' | 'critical';
  matches: ModerationMatch[];
  source: 'api' | 'fallback';
  model: string | null;
}

export const EMPTY_MODERATION_ANALYSIS: ModerationAnalysis = {
  hasBadWords: false,
  score: 0,
  severity: 'clean',
  matches: [],
  source: 'fallback',
  model: null,
};

function toNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toMatches(value: unknown): ModerationMatch[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { word: item, occurrences: 1 } satisfies ModerationMatch;
      }

      const payload = (item ?? {}) as Record<string, unknown>;
      const word = String(payload['word'] ?? payload['term'] ?? payload['token'] ?? '').trim();
      const occurrences = Math.max(
        1,
        toNumber(payload['occurrences'] ?? payload['count'] ?? payload['frequency'] ?? payload['hits']) ?? 1,
      );

      if (!word) {
        return null;
      }

      return {
        word,
        occurrences,
      } satisfies ModerationMatch;
    })
    .filter((entry): entry is ModerationMatch => Boolean(entry));
}

function normalizeSeverity(
  severity: unknown,
  score: number,
  hasBadWords: boolean,
): ModerationAnalysis['severity'] {
  const normalized = String(severity ?? '').trim().toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'blocked') {
    return 'critical';
  }
  if (normalized === 'warning' || normalized === 'medium' || normalized === 'warn') {
    return 'warning';
  }
  if (normalized === 'clean' || normalized === 'low' || normalized === 'ok') {
    return 'clean';
  }

  if (!hasBadWords) {
    return 'clean';
  }

  return score >= 0.7 || score >= 2 ? 'critical' : 'warning';
}

export function parseModerationApiResponse(payload: unknown): ModerationAnalysis {
  const data = (payload ?? {}) as Record<string, unknown>;
  const matches = toMatches(
    data['matches']
      ?? data['badWords']
      ?? data['terms']
      ?? data['keywords']
      ?? data['detectedWords']
      ?? data['words'],
  );
  const explicitScore = toNumber(
    data['score']
      ?? data['moderationScore']
      ?? data['riskScore']
      ?? data['toxicityScore']
      ?? data['confidence'],
  );
  const score = explicitScore ?? matches.reduce((sum, item) => sum + item.occurrences, 0);
  const hasBadWords = Boolean(
    data['hasBadWords']
      ?? data['containsBadWords']
      ?? data['badWordsDetected']
      ?? data['flagged']
      ?? data['toxic']
      ?? (matches.length > 0),
  );
  const severity = normalizeSeverity(data['severity'] ?? data['level'] ?? data['riskLevel'], score, hasBadWords);

  return {
    hasBadWords,
    score,
    severity,
    matches,
    source: 'api',
    model: String(data['model'] ?? data['modelName'] ?? data['engine'] ?? '').trim() || null,
  };
}
