import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscriptions.component.html'
})
export class SubscriptionsComponent {
  plans = [
    {
      name: 'Explorer',
      price: 'Free',
      period: '',
      desc: 'Get started with basic access to events and films.',
      features: ['Browse all events', 'Book up to 2 tickets/month', 'Access feedback system', 'Basic notifications'],
      cta: 'Get Started',
      highlighted: false,
      color: 'border-gray-200'
    },
    {
      name: 'Culture Pass',
      price: '19',
      period: '/month',
      desc: 'Perfect for regular culture enthusiasts.',
      features: ['Unlimited event bookings', '10% discount on tickets', 'Join up to 3 clubs', 'Priority seating', 'Real-time event chat', 'Loyalty points (2x)'],
      cta: 'Subscribe Now',
      highlighted: true,
      color: 'border-primary'
    },
    {
      name: 'Patron',
      price: '39',
      period: '/month',
      desc: 'The ultimate cultural experience with VIP perks.',
      features: ['Everything in Culture Pass', '25% discount on all tickets', 'Unlimited club memberships', 'VIP seating at events', 'Exclusive premiere access', 'Loyalty points (5x)', 'Personal event concierge'],
      cta: 'Go Patron',
      highlighted: false,
      color: 'border-accent'
    }
  ];
}
