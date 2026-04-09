import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubMemberService } from '../../services/club-member.service';
import { ClubParticipationService } from '../../services/club-participation.service';
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

  myMembership: ClubMember | null = null;

  myReservations: ClubParticipation[] = [];

  constructor(
    private memberService: ClubMemberService,
    private participationService: ClubParticipationService
  ) {}

  ngOnInit(): void {

    this.loadMembership();

    this.loadReservations();

  }

  loadMembership(): void {

    this.memberService.getMyMembership().subscribe({

      next: (data) => {

        this.myMembership = data;

      },

      error: () => {

        this.myMembership = null;

      }

    });

  }

  loadReservations(): void {

    this.participationService.myReservations().subscribe({

      next: (data) => {

        this.myReservations = data;

      },

      error: () => {

        this.myReservations = [];

      }

    });

  }

  reservationCount(): number {

    return this.myReservations
      .filter(r => r.status === 'CONFIRMED')
      .length;

  }

}
