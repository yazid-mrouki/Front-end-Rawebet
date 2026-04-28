import { Routes } from '@angular/router';

import { ClubHomeComponent }           from './pages/club-home/club-home.component';
import { ClubEventsComponent }         from './pages/club-events/club-events.component';
import { ClubEventDetailComponent }    from './pages/club-event-detail/club-event-detail.component';
import { ClubMembersComponent }        from './pages/club-members/club-members.component';
import { ClubJoinComponent }           from './pages/club-join/club-join.component';
import { ClubParticipationsComponent } from './pages/club-participations/club-participations.component';
import { ClubAdminComponent }          from './pages/club-admin/club-admin.component';
import { authGuard }                   from '../../core/guards/auth.guard';
import { clubAdminGuard }              from '../../core/guards/club-admin.guard';

export const CLUB_ROUTES: Routes = [
  { path: '',                component: ClubHomeComponent },
  { path: 'events',          component: ClubEventsComponent },
  { path: 'events/:id',      component: ClubEventDetailComponent },
  { path: 'members',         component: ClubMembersComponent },
  { path: 'join',            component: ClubJoinComponent,           canActivate: [authGuard] },
  { path: 'my-reservations', component: ClubParticipationsComponent, canActivate: [authGuard] },
  { path: 'admin',           component: ClubAdminComponent,          canActivate: [clubAdminGuard] },
];