export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'unknown';

export interface SentimentAnalysis {
  label: SentimentLabel;
  score: number;
  confidence: number;
  emoji: string;
  source: 'api' | 'fallback';
  model: string | null;
}

export const EMPTY_SENTIMENT_ANALYSIS: SentimentAnalysis = {
  label: 'unknown',
  score: 0,
  confidence: 0,
  emoji: '🤍',
  source: 'fallback',
  model: null,
};

export function sentimentEmojiForLabel(label: SentimentLabel): string {
  switch (label) {
    case 'positive':
      return '😄';
    case 'negative':
      return '😣';
    case 'neutral':
      return '🙂';
    default:
      return '🤍';
  }
}
