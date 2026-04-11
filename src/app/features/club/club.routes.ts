import { Routes } from '@angular/router';

import { ClubHomeComponent } from './pages/club-home/club-home.component';
import { ClubEventsComponent } from './pages/club-events/club-events.component';
import { ClubMembersComponent } from './pages/club-members/club-members.component';
import { ClubJoinComponent } from './pages/club-join/club-join.component';
import { ClubParticipationsComponent } from './pages/club-participations/club-participations.component';
import { ClubAdminComponent } from './pages/club-admin/club-admin.component';
import { authGuard } from '../../core/guards/auth.guard';
import { clubAdminGuard } from '../../core/guards/club-admin.guard';

export const CLUB_ROUTES: Routes = [

  // Landing page du club
  { path: '', component: ClubHomeComponent },

  // Liste des événements (public)
  { path: 'events', component: ClubEventsComponent },

  // Liste des membres (public)
  { path: 'members', component: ClubMembersComponent },

  // Formulaire d'adhésion (authentifié)
  { path: 'join', component: ClubJoinComponent, canActivate: [authGuard] },

  // Mes réservations (authentifié)
  { path: 'my-reservations', component: ClubParticipationsComponent, canActivate: [authGuard] },

  // Administration club (ADMIN_CLUB ou SUPER_ADMIN uniquement)
  { path: 'admin', component: ClubAdminComponent, canActivate: [clubAdminGuard] }

];