import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, switchMap, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UserInfo {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiBaseUrl;
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(null);
  public userInfo$ = this.userInfoSubject.asObservable();

  private inactivityPoller: any;
  private lastActivityTime: number = Date.now();
  private activityTimeout: any;

  constructor(private router: Router, private http: HttpClient) {
    const storedUserInfo = sessionStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const userInfo = JSON.parse(storedUserInfo) as UserInfo;
        this.userInfoSubject.next(userInfo);
      } catch (e) {
        sessionStorage.removeItem('userInfo');
      }
    }
  }

  // === GETTERS ===

  getRole(): string | null {
    return this.userInfoSubject.value?.role ?? null;
  }

  getFirstName(): string | null {
    return this.userInfoSubject.value?.firstName ?? null;
  }

  getLastName(): string | null {
    return this.userInfoSubject.value?.lastName ?? null;
  }

  getUsername(): string | null {
    return this.userInfoSubject.value?.username ?? null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'SUPER_ADMIN';
  }

  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  isAuthenticated(): boolean {
    return this.userInfoSubject.value !== null;
  }

  getCurrentUser(): UserInfo | null {
    return this.userInfoSubject.value;
  }
  isSandDAdmin(): boolean {
  return this.getRole() === 'SANDD_ADMIN';
}

isMaintenanceAdmin(): boolean {
  return this.getRole() === 'MAINTENANCE_ADMIN';
}

isMaintenanceReporting(): boolean {
  return this.getRole() === 'MAINTENANCE_REPORTING';
}

isAnyAdmin(): boolean {
  const role = this.getRole();
  return role === 'SUPER_ADMIN' || role === 'SANDD_ADMIN' || role === 'MAINTENANCE_ADMIN';
}

  // === API METHODS ===

  fetchUserInfo(): Observable<UserInfo | null> {
    return this.http.get<UserInfo>(`${this.apiUrl}/api/auth/me`, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Accept': 'application/json'
      })
    }).pipe(
      retry(1),
      tap(userInfo => {
        if (userInfo) {
          this.setUserInfo(userInfo);
        }
      }),
      catchError(error => {
        if (error.status === 401) {
          this.logoutGracefully();
        } else {
          this.clearUserInfo();
        }
        return of(null);
      })
    );
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/login`, { username, password }, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).pipe(
      switchMap(() => {
        return this.fetchUserInfo();
      }),
      tap(userInfo => {
        if (userInfo) {
          this.startInactivityPoller(); // 👈 START POLLER
          this.redirectToDashboard();
        } else {
          this.clearUserInfo();
          this.router.navigate(['/login']);
        }
      }),
      catchError(error => {
        return this.handleError('login')(error);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/logout`, {}, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap(() => {
        this.logoutGracefully();
      }),
      catchError(error => {
        this.logoutGracefully();
        return of(null);
      })
    );
  }

  getUserByUsername(username: string): Observable<UserInfo | null> {
    return this.http.get<UserInfo>(`${this.apiUrl}/api/auth/user/username/${username}`, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Accept': 'application/json'
      })
    }).pipe(
      retry(1),
      catchError(error => {
        return of(null);
      })
    );
  }

  deleteUser(userId: number): Observable<any> {
    const url = `${this.apiUrl}/api/users/${userId}`;
    return this.http.delete(url, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Accept': 'application/json'
      })
    }).pipe(
      catchError(this.handleError('deleteUser'))
    );
  }

  // === STATE MANAGEMENT ===

  public clearUserInfo(): void {
    this.userInfoSubject.next(null);
    sessionStorage.removeItem('userInfo');
    localStorage.removeItem('gofa_open_tabs');
  }

  private setUserInfo(userInfo: UserInfo): void {
    this.userInfoSubject.next(userInfo);
    sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  private logoutGracefully(): void {
    this.stopInactivityPoller(); // 👈 STOP POLLER
    this.clearUserInfo();

    // Optional: Show message
    // alert('Your session has expired due to inactivity. Please log in again.');

    this.router.navigate(['/login']);
  }

  // === INACTIVITY POLLER WITH ACTIVITY TRACKING ===

  private updateActivity(): void {
    this.lastActivityTime = Date.now();
    // Reset any pending timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    // Optional: Restart poller if stopped due to inactivity
    if (!this.inactivityPoller && this.isAuthenticated()) {
      this.startInactivityPoller();
    }
  }

  private setupActivityListeners(): void {
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });
  }

  private startInactivityPoller(): void {
  if (this.inactivityPoller) return;

  this.setupActivityListeners();

  // Poll every 115 minutes (just before 2-hour expiry)
  const pollInterval = 115 * 60 * 1000; // 👈 115 minutes in ms

  this.inactivityPoller = setInterval(() => {
    const inactivityMinutes = (Date.now() - this.lastActivityTime) / (1000 * 60);
    
    if (this.isAuthenticated()) {
      if (inactivityMinutes >= 120) { // 👈 2-hour threshold
        this.logoutGracefully();
      } else {
        // Still active → ping server to keep session alive
        this.fetchUserInfo().subscribe();
      }

      // Optional: Set a final safety timeout (not strictly needed with polling)
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
      this.activityTimeout = setTimeout(() => {
        const finalInactivityMinutes = (Date.now() - this.lastActivityTime) / (1000 * 60);
        if (finalInactivityMinutes >= 120) {
          this.logoutGracefully();
        }
      }, 120 * 60 * 1000 - (Date.now() - this.lastActivityTime)); // dynamic, but optional
    } else {
      this.stopInactivityPoller();
    }
  }, pollInterval);
}

  private stopInactivityPoller(): void {
    if (this.inactivityPoller) {
      clearInterval(this.inactivityPoller);
      this.inactivityPoller = undefined;
    }
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = undefined;
    }
    // Note: Listeners are kept for the next login session (global to document)
  }

  // === NAVIGATION ===

  redirectToDashboard(): void {
    const user = this.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const role = user.role;

    switch (role) {
      case 'SUPER_ADMIN':
      case 'SANDD_ADMIN':
      case 'MAINTENANCE_ADMIN':
        this.router.navigate(['/users'], { replaceUrl: true });
        break;
      case 'VHF':
      case 'ELECTRONICS':
      case 'HF':
      case 'SPAREPART':
        this.router.navigate(['/inventory-summary'], { replaceUrl: true });
        break;
      case 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER':
        this.router.navigate(['/team-leader-dashboard'], { replaceUrl: true });
        break;
      case 'TRANSIT':
        this.router.navigate(['/transit/received-items'], { replaceUrl: true });
        break;
      case 'PROPERTY_CONTROL':
      case 'PROPERTY_CONTROL_TEAMLEADER':
        this.router.navigate(['/MasterCard/dashboard'], { replaceUrl: true });
        break;
      case 'PPC':
        this.router.navigate(['/maintenance/request-list'], { replaceUrl: true });
        break;
      case 'MINISTORE':
        this.router.navigate(['/maintenance/spare-parts-requests'], { replaceUrl: true });
        break;
      case 'PTEAM_LEADER':
      case 'OTEAM_LEADER':
      case 'RTEAM_LEADER':
      case 'VTEAM_LEADER':
      case 'HTEAM_LEADER':
        this.router.navigate(['/maintenance/unit-leader-dashboard'], { replaceUrl: true });
        break;
      case 'POWER':
      case 'POWER_MAINTENANCE':
      case 'OFFICE_MACHINE':
      case 'OFFICE_MACHINE_MAINTENANCE':
      case 'RADIO_MAINTENANCE':
      case 'VHF_RADIO':
      case 'VHF_MAINTENANCE':
      case 'HF_RADIO':
      case 'HF_MAINTENANCE':
      case 'IT_MAINTENANCE':
      case 'COMPUTER_MAINTENANCE':
      case 'ELECTRICAL_MAINTENANCE':
      case 'MECHANICAL_MAINTENANCE':
      case 'WELDING_MAINTENANCE':
        this.router.navigate(['/maintenance/power-maintReqList'], { replaceUrl: true });
        break;
      case 'MAINTENANCE_LEADER':
        this.router.navigate(['/maintenance/dashboard'], { replaceUrl: true });
        break;
      case 'QUALITY':
        this.router.navigate(['/maintenance/Give-maintainedEqupment'], { replaceUrl: true });
        break;
      case 'MAINTENANCE_REPORTING':
        this.router.navigate(['/maintenance/dashboard'], { replaceUrl: true });
        break;
      default:
        this.router.navigate(['/login'], { replaceUrl: true });
        break;
    }
  }

  // === ERROR HANDLING ===

  private handleError(operation: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      if (error.status === 401) {
        // If it's a login attempt, show specific error instead of "Session expired"
        if (operation === 'login') {
          const errorMessage = error.error?.message || 'Incorrect password or username';
          return throwError(() => new Error(errorMessage));
        }

        this.logoutGracefully();
        return throwError(() => new Error('Session expired. Please log in again.'));
      }

      let message = `Error during ${operation}`;
      if (error.status === 0) {
        message = 'Unable to connect to the server.';
      } else if (error.status === 403) {
        message = 'Access denied';
      } else if (error.status === 404) {
        message = 'Resource not found';
      } else if (error.status >= 500) {
        message = 'Internal server error';
      } else {
        message = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }

      return throwError(() => new Error(message));
    };
  }
}