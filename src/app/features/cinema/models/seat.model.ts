export type SeatType = 'STANDARD' | 'PMR';

export interface Seat {
  id: number;
  fullLabel: string;
  seatNumber: number;
  seatType: SeatType;
  rowLabel: string;
}

export interface SeatRowResponse {
  id: number;
  rowLabel: string;
  seatCount: number;
  displayOrder: number;
  dominantSeatType: SeatType;
}

export interface RowConfig {
  rowLabel: string;
  seatsPerRow: number;
  seatType: SeatType;
}

export interface ConfigureHallRequest {
  salleId: number;
  numberOfRows?: number;
  seatsPerRow?: number;
  rowConfigs: RowConfig[];
}