import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubMemberService } from '../../services/club-member.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClubMember } from '../../models/club-member.model';
import { ClubNavComponent } from '../../components/club-nav/club-nav.component';

@Component({
  selector: 'app-club-members',
  standalone: true,
  imports: [CommonModule, RouterModule, ClubNavComponent],
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

  showLeaveConfirm = false;

  constructor(
    private memberService: ClubMemberService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isClubAdmin(): boolean {
    return this.auth.isSuperAdmin() || this.auth.hasPermission('CLUB_MANAGE');
  }

  ngOnInit(): void {
    this.loadMembers();
    this.loadMyMembership();
  }

  loadMembers(): void {
    this.memberService.getAllMembers().subscribe({
      next: (data) => { this.members = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  loadMyMembership(): void {
    if (!this.auth.isAuthenticated() || this.isClubAdmin) {
      this.myMembership = null;
      return;
    }
    this.memberService.getMyMembership().subscribe({
      next: (data) => { this.myMembership = data; this.cdr.detectChanges(); },
      error: () => { this.myMembership = null; }
    });
  }

  get activeMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'ACTIVE');
  }

  get leftMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'LEFT');
  }

  // ✅ ADDED
  get removedMembers(): ClubMember[] {
    return this.members.filter(m => m.status === 'REMOVED');
  }

  private showSuccess(msg: string): void {
    this.success = msg;
    setTimeout(() => { this.success = null; }, 4000);
  }

  private showError(msg: string): void {
    this.error = msg;
    setTimeout(() => { this.error = null; }, 6000);
  }

  confirmLeave(): void { this.showLeaveConfirm = true; }
  cancelLeave(): void { this.showLeaveConfirm = false; }

  leaveClub(): void {
    this.showLeaveConfirm = false;
    this.leaveLoading = true;

    this.memberService.leaveClub().subscribe({
      next: () => {
        this.leaveLoading = false;
        this.showSuccess('You have left the club.');
        this.loadMembers();
        this.loadMyMembership();
      },
      error: (err) => {
        this.leaveLoading = false;
        this.showError(err?.error?.error || 'Failed to leave club.');
      }
    });
  }
}