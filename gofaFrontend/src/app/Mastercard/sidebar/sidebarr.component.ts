import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router'; // Import NavigationEnd
import { filter } from 'rxjs/operators'; // Import filter operator
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebarr',
  templateUrl: './sidebarr.component.html',
  styleUrls: ['./sidebarr.component.css']
})
export class TSidebarComponent implements OnInit {
  showSidebar: boolean = false; // Controls the visibility of the sidebar

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Listen to route changes and update sidebar visibility
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd) // Filter only NavigationEnd events
      )
      .subscribe(() => {
        const currentRoute = this.normalizeRoute(this.router.url); // Normalize the route
        this.showSidebar = this.isBincardPage(currentRoute); // Update sidebar visibility
      });
  }

  /**
   * Determines if the current route is one of the Bincard-related pages.
   *
   * @param route - The current route path.
   * @returns True if the route matches a Bincard-related page, otherwise false.
   */
  isBincardPage(route: string): boolean {
    const bincardRoutes = [
      '/transit/received-items', // Example: Received Items page
      '/transit/receive-item-form',
      '/transit/sent-for-inspection',
      '/transit/inspected-items',
      '/transit/send-to-store',
      '/transit/edit-item/:id', // Dynamic route
      
      '/MasterCard/mastercard-list',
      '/MasterCard/mastercard-form',
    ];

    // Check if the normalized route matches any of the Bincard routes
    return bincardRoutes.some(bincardRoute => this.matchRoute(route, bincardRoute));
  }

  /**
   * Matches a route against a pattern, handling dynamic segments.
   *
   * @param actualRoute - The actual route path.
   * @param patternRoute - The route pattern to match.
   * @returns True if the actual route matches the pattern, otherwise false.
   */
  matchRoute(actualRoute: string, patternRoute: string): boolean {
    // Replace dynamic segments in the pattern with regex wildcards
    const regexPattern = new RegExp('^' + patternRoute.replace(/:id/, '[^/]+') + '$');
    return regexPattern.test(actualRoute);
  }

  /**
   * Normalizes the route by removing query parameters and fragments.
   *
   * @param route - The raw route path.
   * @returns The normalized route path.
   */
  normalizeRoute(route: string): string {
    return route.split('?')[0].split('#')[0]; // Remove query params and fragments
  }

  /**
   * Handles user logout by calling the AuthService's logout method.
   */
  onLogout(): void {
    this.authService.logout(); // Call the logout method from AuthService
    console.log('User logged out successfully.');
  }
}
