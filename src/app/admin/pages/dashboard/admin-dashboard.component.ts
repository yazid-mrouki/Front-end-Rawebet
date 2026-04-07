import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent {
  // KPI cards
  kpis = [
    { label: 'Total Users', value: '10,482', change: '+12.5%', trend: 'up', icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Active Events', value: '24', change: '+3', trend: 'up', icon: '🎭', color: 'from-purple-500 to-purple-600' },
    { label: 'Tickets Sold', value: '3,847', change: '+18.2%', trend: 'up', icon: '🎟️', color: 'from-accent to-yellow-500' },
    { label: 'Revenue (TND)', value: '48,250', change: '+8.7%', trend: 'up', icon: '💰', color: 'from-green-500 to-emerald-600' },
    { label: 'Active Clubs', value: '12', change: '+2', trend: 'up', icon: '👥', color: 'from-pink-500 to-rose-600' },
    { label: 'Subscriptions', value: '1,256', change: '+5.3%', trend: 'up', icon: '💳', color: 'from-primary to-primary-light' },
  ];

  // Revenue chart data (mock bars)
  revenueMonths = [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 45 },
    { month: 'Mar', value: 78 },
    { month: 'Apr', value: 52 },
    { month: 'May', value: 90 },
    { month: 'Jun', value: 72 },
    { month: 'Jul', value: 85 },
    { month: 'Aug', value: 60 },
    { month: 'Sep', value: 95 },
    { month: 'Oct', value: 70 },
    { month: 'Nov', value: 88 },
    { month: 'Dec', value: 100 },
  ];

  // Ticket distribution
  ticketCategories = [
    { name: 'Film Screenings', count: 1540, pct: 40, color: 'bg-blue-500' },
    { name: 'Watch Parties', count: 962, pct: 25, color: 'bg-green-500' },
    { name: 'Live Events', count: 770, pct: 20, color: 'bg-purple-500' },
    { name: 'Workshops', count: 385, pct: 10, color: 'bg-accent' },
    { name: 'Exhibitions', count: 190, pct: 5, color: 'bg-pink-500' },
  ];

  // Recent events
  recentEvents = [
    { name: 'Champions League Final', type: 'Watch Party', date: 'May 31', status: 'Upcoming', tickets: 156, capacity: 200, emoji: '⚽' },
    { name: 'Indie Film Festival', type: 'Film Premiere', date: 'Jun 5', status: 'On Sale', tickets: 78, capacity: 120, emoji: '🎬' },
    { name: 'Acting Masterclass', type: 'Workshop', date: 'Jun 12', status: 'Open', tickets: 18, capacity: 30, emoji: '🎭' },
    { name: 'Comedy Night', type: 'Live Show', date: 'Jun 25', status: 'On Sale', tickets: 116, capacity: 150, emoji: '😂' },
    { name: 'Music Evening', type: 'Concert', date: 'Jul 3', status: 'Planning', tickets: 0, capacity: 500, emoji: '🎵' },
  ];

  // Recent activity feed
  activityFeed = [
    { text: 'New user registered: Sami Trabelsi', time: '2 min ago', icon: '👤' },
    { text: 'Ticket purchased for Film Festival (x3)', time: '8 min ago', icon: '🎟️' },
    { text: 'Club "Cinema Club" added new member', time: '15 min ago', icon: '👥' },
    { text: 'Feedback submitted for Comedy Night (⭐⭐⭐⭐⭐)', time: '25 min ago', icon: '💬' },
    { text: 'Material request approved: Projector HD', time: '32 min ago', icon: '📦' },
    { text: 'Subscription renewed: Culture Pass (Ahmed)', time: '45 min ago', icon: '💳' },
    { text: 'New event created: Art Exhibition', time: '1 hour ago', icon: '🎭' },
    { text: 'Loyalty tier upgrade: Bronze → Silver (Fatma)', time: '1 hour ago', icon: '⭐' },
  ];

  // Top members
  topMembers = [
    { name: 'Ahmed Ben Ali', points: 2450, tier: 'Gold', avatar: 'A', events: 23 },
    { name: 'Fatma Saidi', points: 2100, tier: 'Gold', avatar: 'F', events: 19 },
    { name: 'Sami Trabelsi', points: 1850, tier: 'Silver', avatar: 'S', events: 17 },
    { name: 'Nour Hamdi', points: 1620, tier: 'Silver', avatar: 'N', events: 14 },
    { name: 'Youssef Karim', points: 1200, tier: 'Silver', avatar: 'Y', events: 11 },
  ];

  // Subscription distribution
  subscriptionData = [
    { plan: 'Explorer (Free)', count: 7200, pct: 69, color: 'bg-gray-400' },
    { plan: 'Culture Pass', count: 2500, pct: 24, color: 'bg-primary' },
    { plan: 'Patron', count: 782, pct: 7, color: 'bg-accent' },
  ];

  getStatusClass(status: string): string {
    switch(status) {
      case 'Upcoming': return 'bg-blue-50 text-blue-600';
      case 'On Sale': return 'bg-green-50 text-green-600';
      case 'Open': return 'bg-purple-50 text-purple-600';
      case 'Planning': return 'bg-yellow-50 text-yellow-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getTierColor(tier: string): string {
    switch(tier) {
      case 'Gold': return 'text-accent';
      case 'Silver': return 'text-gray-400';
      case 'Platinum': return 'text-purple-500';
      default: return 'text-orange-600';
    }
  }
}
