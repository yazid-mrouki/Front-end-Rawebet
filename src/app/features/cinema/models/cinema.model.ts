export interface Cinema {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  openingHours?: string;
}

export interface CreateCinemaRequest {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  openingHours: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}