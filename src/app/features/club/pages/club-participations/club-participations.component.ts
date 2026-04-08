import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubParticipationService } from '../../services/club-participation.service';
import { ClubParticipation } from '../../models/club-participation.model';

@Component({
  selector: 'app-club-participations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './club-participations.component.html',
  styleUrls: ['./club-participations.component.scss']
})
export class ClubParticipationsComponent implements OnInit {

  reservations: ClubParticipation[] = [];

  loading = true;

  constructor(
    private participationService: ClubParticipationService
  ){}

  ngOnInit(): void {

    this.loadReservations();

  }

  loadReservations(): void{

    this.participationService.myReservations().subscribe({

      next:(data)=>{

        this.reservations = data;

        this.loading = false;

      },

      error:()=>{

        this.loading = false;

      }

    });

  }

  cancel(id:number):void{

    this.participationService.cancel(id).subscribe({

      next:()=>{

        this.loadReservations();

      }

    });

  }

}