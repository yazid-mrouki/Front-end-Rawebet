import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  features = [
    { icon: '🎬', title: 'Films & Premieres', desc: 'Watch the latest movies, attend exclusive premieres and get your tickets instantly.' },
    { icon: '🎭', title: 'Live Events', desc: 'From watch parties to cultural shows — discover and book events effortlessly.' },
    { icon: '👥', title: 'Clubs & Communities', desc: 'Join cinema and theatre clubs, participate in training programs online or in-person.' },
    { icon: '🎟️', title: 'Smart Ticketing', desc: 'One platform, one booking. Receive digital tickets instantly after payment.' },
    { icon: '💬', title: 'Real-Time Chat', desc: 'Interact with other attendees during movies and events. Share reactions live.' },
    { icon: '⭐', title: 'Loyalty & Rewards', desc: 'Earn points, unlock benefits, and enjoy exclusive member-only perks.' },
    { icon: '📊', title: 'Feedback System', desc: 'Rate your experiences and help us improve every event and screening.' },
    { icon: '💳', title: 'Subscriptions', desc: 'Choose flexible plans that match your cultural appetite and save more.' }
  ];

  stats = [
    { value: '50%', label: 'Faster Booking', icon: '⚡' },
    { value: '500+', label: 'Events Hosted', icon: '🎭' },
    { value: '10K+', label: 'Active Members', icon: '👥' },
    { value: '98%', label: 'Satisfaction Rate', icon: '💯' }
  ];

  upcomingEvents = [
    { title: 'Champions League Final Watch Party', category: 'Watch Party', date: 'May 31, 2026', image: '⚽', color: 'from-green-500 to-emerald-700' },
    { title: 'Indie Film Festival – Opening Night', category: 'Film Premiere', date: 'June 5, 2026', image: '🎬', color: 'from-primary to-primary-light' },
    { title: 'Theatre Workshop: Acting Masterclass', category: 'Club Event', date: 'June 12, 2026', image: '🎭', color: 'from-accent to-yellow-500' },
    { title: 'Art & Photography Exhibition', category: 'Exhibition', date: 'June 20, 2026', image: '🖼️', color: 'from-purple-600 to-indigo-700' },
    { title: 'Stand-Up Comedy Night', category: 'Live Show', date: 'June 25, 2026', image: '😂', color: 'from-pink-500 to-rose-700' },
    { title: 'Cultural Music Evening', category: 'Concert', date: 'July 3, 2026', image: '🎵', color: 'from-blue-500 to-cyan-700' }
  ];
}
