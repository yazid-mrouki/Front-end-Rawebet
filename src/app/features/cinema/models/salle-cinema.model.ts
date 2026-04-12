export type HallType = 'STANDARD' | 'PREMIUM';
export type ScreenType = 'TWO_D' | 'THREE_D' | 'IMAX';

export interface SalleCinema {
  id: number;
  name: string;
  hallType: HallType;
  screenType: ScreenType;
  totalCapacity: number;
  isActive: boolean;
}

export interface CreateSalleRequest {
  cinemaId: number;
  name: string;
  hallType: HallType;
  screenType: ScreenType;
}