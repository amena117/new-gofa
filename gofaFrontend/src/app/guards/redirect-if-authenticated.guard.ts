import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RedirectIfAuthenticatedGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated()) {
      console.log('Authenticated user tried to access /login, redirecting to dashboard');
      this.authService.redirectToDashboard(); // Redirect to role-based dashboard
      return false; // Prevent access to /login
    }
    return true; // Allow unauthenticated users to access /login
  }
}