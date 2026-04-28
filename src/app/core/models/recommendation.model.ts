export interface MovieRecommendation {
  id: number;
  title: string;
  genre: string;
  posterUrl: string;
  score: number;
  matchPercent: number;
}
