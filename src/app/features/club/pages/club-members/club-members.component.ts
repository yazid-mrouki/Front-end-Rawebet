import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubMemberService } from '../../services/club-member.service';
import { ClubMember } from '../../models/club-member.model';

@Component({
  selector: 'app-club-members',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './club-members.component.html',
  styleUrls: ['./club-members.component.scss']
})
export class ClubMembersComponent implements OnInit {

  members: ClubMember[] = [];
  myMembership: ClubMember | null = null;

  loading = true;
  leaveLoading = false;
  error: string | null = null;
  success: string | null = null;

  // Confirmation dialog
  showLeaveConfirm = false;

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
      error: () => { this.loading = false; }
    });
  }

  loadMyMembership(): void {
    this.memberService.getMyMembership().subscribe({
      next: (data) => { this.myMembership = data; },
      error: () => { this.myMembership = null; }
    });
  }

  get activeMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'ACTIVE');
  }

  get leftMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'LEFT');
  }

  confirmLeave(): void {
    this.showLeaveConfirm = true;
  }

  cancelLeave(): void {
    this.showLeaveConfirm = false;
  }

  leaveClub(): void {
    this.showLeaveConfirm = false;
    this.leaveLoading = true;
    this.error = null;

    this.memberService.leaveClub().subscribe({
      next: () => {
        this.success = 'You have left the club.';
        this.leaveLoading = false;
        this.loadMembers();
        this.loadMyMembership();
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to leave club.';
        this.leaveLoading = false;
      }
    });
  }
}