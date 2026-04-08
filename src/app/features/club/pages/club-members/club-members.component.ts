import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubMemberService } from '../../services/club-member.service';
import { ClubMember } from '../../models/club-member.model';

@Component({
  selector: 'app-club-members',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './club-members.component.html',
  styleUrls: ['./club-members.component.scss']
})
export class ClubMembersComponent implements OnInit {

  members: ClubMember[] = [];

  myMembership: ClubMember | null = null;

  loading = true;

  constructor(private memberService: ClubMemberService) {}

  ngOnInit(): void {

    this.loadMembers();

    this.loadMyMembership();

  }

  loadMembers(): void {

    this.memberService.getAllMembers().subscribe({

      next: (data) => {

        this.members = data;

        this.loading = false;

      },

      error: () => {

        this.loading = false;

      }

    });

  }

  loadMyMembership(): void {

    this.memberService.getMyMembership().subscribe({

      next: (data) => {

        this.myMembership = data;

      },

      error: () => {

        this.myMembership = null;

      }

    });

  }

  leaveClub(): void {

    this.memberService.leaveClub().subscribe({

      next: () => {

        this.loadMembers();

        this.loadMyMembership();

      }

    });

  }

}