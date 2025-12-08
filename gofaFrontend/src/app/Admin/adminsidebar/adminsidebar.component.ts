import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-adminsidebar',
  templateUrl: './adminsidebar.component.html',
  styleUrls: ['./adminsidebar.component.css']
})
export class AdminsidebarComponent implements OnInit, OnDestroy {
  showSidebar: boolean = false;
  firstName: string | null = null;
  role: string | null = null;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.updateUserInfo();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentRoute = this.normalizeRoute(this.router.url);
        this.showSidebar = this.isAdminPage(currentRoute);
        this.updateBodyClass(); // Update body class based on sidebar visibility
      });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('sidebar-open'); // Clean up on component destroy
  }

  private updateUserInfo(): void {
    this.firstName = this.authService.getFirstName();
    this.role = this.authService.getRole();
    console.log('Sidebar - FirstName:', this.firstName, 'Role:', this.role);
  }

  private updateBodyClass(): void {
    if (this.showSidebar) {
      document.body.classList.add('sidebar-open'); // Add class when sidebar is visible
    } else {
      document.body.classList.remove('sidebar-open'); // Remove class when hidden
    }
  }

  isAdminPage(route: string): boolean {
    const adminRoutes = [
      '/shelf',
      '/shelves',
      '/warehouse',
      '/warehouses',
      '/admin-dashboard',
      '/users',
      '/register'
    ];
    return adminRoutes.some(adminRoute => this.matchRoute(route, adminRoute));
  }

  matchRoute(actualRoute: string, patternRoute: string): boolean {
    const regexPattern = new RegExp('^' + patternRoute.replace(/:id/, '[^/]+') + '$');
    return regexPattern.test(actualRoute);
  }

  normalizeRoute(route: string): string {
    return route.split('?')[0].split('#')[0];
  }

  onLogout(): void {
    this.authService.logout();
    console.log('User logged out successfully.');
    this.showSidebar = false;
    this.updateBodyClass(); // Ensure class is removed on logout
  }
}