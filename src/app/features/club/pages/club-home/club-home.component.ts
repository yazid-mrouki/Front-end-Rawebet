import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClubMemberService } from '../../services/club-member.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClubMember } from '../../models/club-member.model';

@Component({
  selector: 'app-club-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './club-home.component.html',
  styleUrls: ['./club-home.component.scss']
})
export class ClubHomeComponent implements OnInit {

  myMembership: ClubMember | null = null;
  membershipLoaded = false;

  constructor(
    private memberService: ClubMemberService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    if (!this.auth.isAuthenticated() || this.auth.isSuperAdmin() || this.auth.hasPermission('CLUB_MANAGE')) {
      this.membershipLoaded = true;
    }
  }

  get isClubAdmin(): boolean {
    return this.auth.isSuperAdmin() || this.auth.hasPermission('CLUB_MANAGE');
  }

  ngOnInit(): void {
    if (!this.auth.isAuthenticated() || this.isClubAdmin) return;

    this.memberService.getMyMembership().subscribe({
      next: (data) => { this.myMembership = data; this.membershipLoaded = true; this.cdr.detectChanges(); },
      error: () => { this.myMembership = null; this.membershipLoaded = true; this.cdr.detectChanges(); },
    });
  }
}