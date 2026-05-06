export interface MovieRecommendation {
  id: number;
  title: string;
  genre: string;
  posterUrl: string;
  score: number;
  matchPercent: number;
}

export interface RecommendationPayload {
  age: number;
  budget: number;
  monthly_cinema_visits: number;
  preferred_genre: string;
  watch_time_pref: string;
  has_streaming_subscription: boolean;
  avg_ticket_price?: number;
  group_size?: number;
  distance_km?: number;
  app_sessions_per_week?: number;
  last_booking_days_ago?: number;
  promo_sensitivity?: number;
  satisfaction_score?: number;
}

export interface RecommendationApiResponse {
  prediction?: string;
  probabilities?: Record<string, number>;
  recommendedSubscription?: string;
  confidence?: number;
  message?: string;
}

export interface RecommendationResult {
  prediction: string;
  probabilities: Record<string, number>;
  confidence: number;
}
