import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-films',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './films.component.html'
})
export class FilmsComponent {
  films = [
    { id: 1, title: 'The Last Horizon', genre: 'Sci-Fi / Drama', duration: '2h 15min', rating: 4.8, price: '12 TND', emoji: '🚀', showtimes: ['14:00', '17:30', '20:00'], description: 'A visually stunning journey through space and time.' },
    { id: 2, title: 'Whispers of the Past', genre: 'Mystery / Thriller', duration: '1h 55min', rating: 4.5, price: '10 TND', emoji: '🔍', showtimes: ['15:00', '18:00', '21:00'], description: 'An atmospheric tale of secrets buried for decades.' },
    { id: 3, title: 'Echoes of Home', genre: 'Drama / Family', duration: '2h 05min', rating: 4.9, price: '10 TND', emoji: '🏠', showtimes: ['13:00', '16:00', '19:00'], description: 'A heartwarming story about roots and belonging.' },
    { id: 4, title: 'Neon Nights', genre: 'Action / Cyberpunk', duration: '2h 20min', rating: 4.3, price: '15 TND', emoji: '🌃', showtimes: ['16:30', '19:30', '22:00'], description: 'High-octane action in a neon-drenched future city.' },
    { id: 5, title: 'The Garden of Words', genre: 'Animation / Romance', duration: '1h 30min', rating: 4.7, price: '8 TND', emoji: '🌸', showtimes: ['11:00', '14:30', '17:00'], description: 'A beautifully animated tale of love and poetry.' },
    { id: 6, title: 'Under the Stars', genre: 'Documentary', duration: '1h 45min', rating: 4.6, price: '8 TND', emoji: '🌟', showtimes: ['10:00', '13:30', '16:00'], description: 'Exploring the wonders of the universe through breathtaking visuals.' }
  ];

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }
}
