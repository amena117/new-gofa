import { Injectable } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate: CanActivateFn = (route, state) => {
    // First check if we have user info
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const allowedRoles = route.data['roles'] as Array<string>;
      
      if (!allowedRoles || allowedRoles.includes(currentUser.role)) {
        return true;
      }
      
      this.router.navigate(['/unauthorized']);
      return false;
    }

    // If not authenticated, try to fetch user info
    return this.authService.fetchUserInfo().pipe(
      take(1),
      map(userInfo => {
        if (!userInfo) {
          this.router.navigate(['/login']);
          return false;
        }

        const allowedRoles = route.data['roles'] as Array<string>;
        if (!allowedRoles || allowedRoles.includes(userInfo.role)) {
          return true;
        }

        this.router.navigate(['/unauthorized']);
        return false;
      })
    );
  };
}