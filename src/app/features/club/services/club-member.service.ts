import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClubMember } from '../models/club-member.model';

@Injectable({
  providedIn: 'root'
})
export class ClubMemberService {

  private apiUrl = '/api/club/members';

  constructor(private http: HttpClient) {}

  getMyMembership(): Observable<ClubMember>{

    return this.http.get<ClubMember>(
      `${this.apiUrl}/me`
    );

  }

  getAllMembers(): Observable<ClubMember[]>{

    return this.http.get<ClubMember[]>(
      this.apiUrl
    );

  }

  leaveClub(): Observable<void>{

    return this.http.post<void>(
      `${this.apiUrl}/leave`,
      {}
    );

  }

}