import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {

  mobileMenuOpen = false;

  managementDropdown = false;

  profileDropdown = false;

  userName = '';

  private auth = inject(AuthService);

  private userService = inject(UserService);

  ngOnInit(){

    if(this.auth.isAuthenticated()){

      this.userService.getMe().subscribe({

        next:(u)=>{

          const anyU = u as any;

          this.userName =
            anyU.nom ||
            anyU.fullName ||
            anyU.name ||
            anyU.username ||
            '';

        }

      });

    }

    this.auth.authState.subscribe(authenticated=>{

      if(authenticated){

        this.userService.getMe().subscribe({

          next:(u)=>{

            const anyU = u as any;

            this.userName =
              anyU.nom ||
              anyU.fullName ||
              anyU.name ||
              anyU.username ||
              '';

          }

        });

      }

      else{

        this.userName='';

      }

    });

  }

  toggleMobileMenu(){

    this.mobileMenuOpen =
      !this.mobileMenuOpen;

  }

  toggleManagement(){

    this.managementDropdown =
      !this.managementDropdown;

    this.profileDropdown=false;

  }

  toggleProfile(){

    this.profileDropdown =
      !this.profileDropdown;

    this.managementDropdown=false;

  }

  closeDropdowns(){

    this.managementDropdown=false;

    this.profileDropdown=false;

  }

  isAuthenticated(){

    return this.auth.isAuthenticated();

  }

  isAdmin(){

    return this.auth.isAdmin();

  }

  logout(){

    this.closeDropdowns();

    this.auth.logout();

  }

}