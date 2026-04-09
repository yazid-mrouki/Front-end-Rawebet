import { Routes } from '@angular/router';

import { ClubHomeComponent } from './pages/club-home/club-home.component';
import { ClubEventsComponent } from './pages/club-events/club-events.component';
import { ClubMembersComponent } from './pages/club-members/club-members.component';
import { ClubJoinComponent } from './pages/club-join/club-join.component';
import { ClubParticipationsComponent } from './pages/club-participations/club-participations.component';

export const CLUB_ROUTES: Routes = [

  {
    path:'',
    component: ClubHomeComponent,
    children:[

      // Default → redirect to events
      {
        path:'',
        redirectTo:'events',
        pathMatch:'full'
      },

      // Club events
      {
        path:'events',
        component: ClubEventsComponent
      },

      // Club members
      {
        path:'members',
        component: ClubMembersComponent
      },

      // Join request
      {
        path:'join',
        component: ClubJoinComponent
      },

      // My reservations
      {
        path:'my-reservations',
        component: ClubParticipationsComponent
      }

    ]
  }

];