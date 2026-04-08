import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { ClubMemberService } from '../../services/club-member.service';
import { ClubParticipationService } from '../../services/club-participation.service';

import { Club } from '../../models/club.model';
import { ClubMember } from '../../models/club-member.model';
import { ClubParticipation } from '../../models/club-participation.model';

@Component({
  selector: 'app-club-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './club-home.component.html',
  styleUrls: ['./club-home.component.scss']
})
export class ClubHomeComponent implements OnInit {

  club: Club | null = null;

  myMembership: ClubMember | null = null;

  myReservations: ClubParticipation[] = [];

  loading = true;

  error: string | null = null;

  constructor(
    private clubService: ClubService,
    private memberService: ClubMemberService,
    private participationService: ClubParticipationService
  ) {}

  ngOnInit(): void {

    this.loadClub();

    this.loadMembership();

    this.loadReservations();

  }

  loadClub(): void {

    this.clubService.getClub().subscribe({

      next: (data) => {

        this.club = data;

        this.loading = false;

      },

      error: () => {

        this.error = 'Failed to load club';

        this.loading = false;

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

  loadReservations():void{

    this.participationService.myReservations()
    .subscribe({

      next:(data)=>{

        this.myReservations = data;

      }

    });

  }

  reservationCount():number{

    return this.myReservations
      .filter(r => r.status === 'CONFIRMED')
      .length;

  }

}