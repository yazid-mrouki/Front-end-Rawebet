import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clubs.component.html'
})
export class ClubsComponent {
  clubs = [
    { id: 1, name: 'Cinema Club', members: 124, emoji: '🎬', desc: 'Film discussions, screenwriting workshops, and indie screenings.', nextSession: 'Every Saturday, 3:00 PM', tags: ['Film', 'Screenwriting', 'Discussion'] },
    { id: 2, name: 'Theatre Troupe', members: 56, emoji: '🎭', desc: 'Acting masterclasses, improv sessions, and stage productions.', nextSession: 'Every Tuesday, 6:00 PM', tags: ['Acting', 'Improv', 'Stage'] },
    { id: 3, name: 'Music Ensemble', members: 78, emoji: '🎵', desc: 'Jam sessions, music theory workshops, and live performances.', nextSession: 'Every Wednesday, 5:00 PM', tags: ['Music', 'Performance', 'Theory'] },
    { id: 4, name: 'Book Circle', members: 92, emoji: '📚', desc: 'Monthly book discussions, author meetups, and reading challenges.', nextSession: 'First Sunday of month, 2:00 PM', tags: ['Reading', 'Discussion', 'Literature'] },
    { id: 5, name: 'Photography Guild', members: 45, emoji: '📷', desc: 'Photo walks, editing workshops, and gallery exhibitions.', nextSession: 'Every Friday, 4:00 PM', tags: ['Photography', 'Editing', 'Exhibition'] },
    { id: 6, name: 'Dance Studio', members: 68, emoji: '💃', desc: 'From traditional to modern — dance workshops for all levels.', nextSession: 'Every Monday, 7:00 PM', tags: ['Dance', 'Workshop', 'Performance'] }
  ];
}
