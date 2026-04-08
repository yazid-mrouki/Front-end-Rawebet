import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClubEventService } from '../../services/club-event.service';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubMemberService } from '../../services/club-member.service';
import { ClubEvent } from '../../models/club-event.model';
import { ClubParticipation } from '../../models/club-participation.model';
import { ClubMember } from '../../models/club-member.model';

@Component({
  selector: 'app-club-events',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './club-events.component.html',
  styleUrls: ['./club-events.component.scss']
})
export class ClubEventsComponent implements OnInit {

  events: ClubEvent[] = [];

  reservations: ClubParticipation[] = [];

  myMembership: ClubMember | null = null;

  loading = true;

  error: string | null = null;

  success:string | null = null;

  places: {[key:number]:number} = {};

  constructor(
    private eventService: ClubEventService,
    private participationService: ClubParticipationService,
    private memberService: ClubMemberService
  ) {}

  ngOnInit(): void {

    this.loadAll();

  }

  loadAll():void{

    this.error = null;

    this.success = null;

    this.loadEvents();

    this.loadReservations();

    this.loadMembership();

  }

  loadEvents(): void {

    this.eventService.getEvents().subscribe({

      next:(data)=>{

        this.events = data;

        this.loading = false;

        data.forEach(e => {

          if(!this.places[e.id]){

            this.places[e.id] = 1;

          }

        });

      },

      error:()=>{

        this.error = 'Failed to load events';

        this.loading = false;

      }

    });

  }

  loadReservations():void{

    this.participationService.myReservations()
    .subscribe({

      next:(data)=>{

        this.reservations = data;

      }

    });

  }

  loadMembership():void{

    this.memberService.getMyMembership()
    .subscribe({

      next:(data)=>{

        this.myMembership = data;

      },

      error:()=>{

        this.myMembership = null;

      }

    });

  }

  alreadyReserved(eventId:number):boolean{

    return this.reservations
      .some(r =>
        r.eventId === eventId &&
        r.status === 'CONFIRMED'
      );

  }

  reserve(eventId:number):void{

    this.error = null;

    this.success = null;

    if(!this.myMembership){

      this.error =
        'You must join the club before reserving';

      return;

    }

    if(this.alreadyReserved(eventId)){

      return;

    }

    const places = this.places[eventId];

    if(!places || places < 1){

      this.error =
        'Invalid number of places';

      return;

    }

    this.participationService.reserve({

      eventId:eventId,

      places:places

    }).subscribe({

      next:()=>{

        this.success =
          'Reservation confirmed';

        this.loadAll();

      },

      error:(err)=>{

        this.error =
          err?.error?.error ||
          'Reservation failed';

      }

    });

  }

}