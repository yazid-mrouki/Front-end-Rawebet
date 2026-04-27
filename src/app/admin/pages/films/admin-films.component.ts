import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-films',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-films.component.html'
})
export class AdminFilmsComponent {
  searchQuery = '';

  films = [
    { id: 1, title: 'The Last Chapter', director: 'Karim Ben Salah', genre: 'Drama', duration: 125, rating: 4.5, showtimes: 3, status: 'Now Showing' },
    { id: 2, title: 'Medina Nights', director: 'Leila Bouzid', genre: 'Romance', duration: 98, rating: 4.2, showtimes: 2, status: 'Now Showing' },
    { id: 3, title: 'Desert Wind', director: 'Nouri Bouzid', genre: 'Adventure', duration: 140, rating: 4.8, showtimes: 4, status: 'Coming Soon' },
    { id: 4, title: 'The Olive Tree', director: 'Hiam Abbas', genre: 'Documentary', duration: 90, rating: 4.1, showtimes: 1, status: 'Now Showing' },
    { id: 5, title: 'Fragments', director: 'Ala Eddine Slim', genre: 'Experimental', duration: 110, rating: 3.9, showtimes: 2, status: 'Coming Soon' },
    { id: 6, title: 'Blue Door', director: 'Anis Lassoued', genre: 'Thriller', duration: 105, rating: 4.3, showtimes: 0, status: 'Archived' },
  ];

  get filteredFilms() {
    return this.films.filter(f => f.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || f.director.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  getStatusClass(s: string) {
    return s === 'Now Showing' ? 'bg-green-50 text-green-600' : s === 'Coming Soon' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500';
  }

  deleteFilm(id: number) { this.films = this.films.filter(f => f.id !== id); }
}
