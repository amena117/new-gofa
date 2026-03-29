import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  password?: string;
  confirmPassword?: string;
  isEditing?: boolean;
  originalData?: User;
  isDisabled: boolean;
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  isLoading = false;
  error: string | null = null;
  searchName = '';
  selectedRole = '';

  // Define all available roles
  allAvailableRoles = [
    'VHF', 'HF', 'ELECTRONICS', 'SPAREPART', 'PROPERTY_CONTROL',
    'SUPPLY_AND_DISTRIBUTION_MANAGER', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER',
    'PROPERTY_CONTROL_TEAMLEADER', 'PROPERTY_CONTROL_HEAD', 'SUPPLY_AND_DISTRIBUTION_HEAD',
    'TRANSIT', 'PPC', 'POWER', 'QUALITY', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE',
    'ELECTRONICS_PTEAM', 'ELECTRONICS_HTEAM', 'MINISTORE', 'RADIO', 'SUPER_ADMIN',
    'MAINTENANCE_LEADER', 'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER',
    'SANDD_ADMIN', 'MAINTENANCE_ADMIN'
  ];

  // SSandmadmin Roles (Strict List)
  sandDRoles = [
    'VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'PROPERTY_CONTROL',
    'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 'PROPERTY_CONTROL_TEAMLEADER', 'TRANSIT'
  ];

  // Maintenance Admin Roles (The rest)
  maintenanceRoles = [
    'SUPPLY_AND_DISTRIBUTION_MANAGER', 'SUPPLY_AND_DISTRIBUTION_HEAD',
    'PPC', 'POWER', 'QUALITY', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE',
    'ELECTRONICS_PTEAM', 'ELECTRONICS_HTEAM', 'MINISTORE', 'RADIO',
    'MAINTENANCE_LEADER', 'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER'
  ];

  availableRoles: string[] = [];
  currentUserRole: string | null = null;
  currentPage = 1;
  totalPages = 1;
  pageSize = 5;

  private apiUrl = `${environment.apiBaseUrl}/api/auth`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  ngOnInit() {
    console.log('[UserListComponent] Initializing with apiUrl:', this.apiUrl);
    this.currentUserRole = this.authService.getRole();
    this.setAvailableRolesBasedOnUser();
    this.loadUsers();
  }

  private setAvailableRolesBasedOnUser() {
    if (this.authService.isAdmin()) {
      // SUPER_ADMIN can see all roles
      this.availableRoles = [...this.allAvailableRoles];
    } else if (this.authService.isSandDAdmin()) {
      // SANDD_ADMIN can only see Supply & Distribution related roles
      this.availableRoles = [...this.sandDRoles];
    } else if (this.authService.isMaintenanceAdmin()) {
      // MAINTENANCE_ADMIN can only see Maintenance related roles
      this.availableRoles = [...this.maintenanceRoles];
    } else {
      // Non-admin users shouldn't access this page (handled by auth guard)
      this.availableRoles = [];
    }
  }

  // Change from private to public so template can access it
  canManageUser(userRole: string): boolean {
    const currentRole = this.currentUserRole;

    if (!currentRole) return false;

    if (currentRole === 'SUPER_ADMIN') {
      return true;
    }

    if (currentRole === 'SANDD_ADMIN') {
      // SANDD_ADMIN can only manage their specific list
      return this.sandDRoles.includes(userRole);
    }

    if (currentRole === 'MAINTENANCE_ADMIN') {
      // MAINTENANCE_ADMIN can only manage the rest
      return this.maintenanceRoles.includes(userRole);
    }

    return false;
  }

  private canSeeUser(userRole: string): boolean {
    const currentRole = this.currentUserRole;

    if (!currentRole) return false;

    if (currentRole === 'SUPER_ADMIN') {
      return true;
    }

    if (currentRole === 'SANDD_ADMIN') {
      return this.sandDRoles.includes(userRole) || userRole === 'SANDD_ADMIN';
    }

    if (currentRole === 'MAINTENANCE_ADMIN') {
      return this.maintenanceRoles.includes(userRole) || userRole === 'MAINTENANCE_ADMIN';
    }

    return false;
  }

  private getXsrfToken(): string {
    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let c of ca) {
      c = c.trim();
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    console.warn('[UserListComponent] XSRF-TOKEN cookie not found');
    return '';
  }

  loadUsers() {
    this.isLoading = true;
    this.error = null;

    if (!this.authService.isAuthenticated() || !this.authService.isAnyAdmin()) {
      console.warn('[UserListComponent] User not authorized to view users');
      this.error = 'You are not authorized to view this page.';
      this.isLoading = false;
      this.authService.logout();
      return;
    }

    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    this.http.get<any>(`${this.apiUrl}/users`, {
      withCredentials: true,
      headers
    }).pipe(
      catchError(error => {
        console.error('[UserListComponent] Error loading users:', error);
        if (error.status === 401) {
          this.authService.logout();
          return throwError(() => new Error('Session expired. Please log in again.'));
        }
        return throwError(() => new Error('Failed to load users. Please try again.'));
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Filter users based on current user's role
          this.users = response.data
            .filter((user: User) => this.canSeeUser(user.role))
            .sort((a: User, b: User) => b.id - a.id);

          this.applyFilters();
        } else {
          this.error = response.message || 'Failed to load users';
        }
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    this.filteredUsers = [...this.users];

    if (this.searchName.trim()) {
      this.filteredUsers = this.filteredUsers.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(this.searchName.toLowerCase()) ||
        user.username.toLowerCase().includes(this.searchName.toLowerCase())
      );
    }

    if (this.selectedRole) {
      this.filteredUsers = this.filteredUsers.filter(user => user.role === this.selectedRole);
    }

    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, Math.max(1, this.totalPages));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFilters();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFilters();
    }
  }

  startEditing(user: User) {
    if (!this.canManageUser(user.role)) {
      alert('You do not have permission to edit this user.');
      return;
    }

    user.isEditing = true;
    user.password = '';
    user.confirmPassword = '';
    user.originalData = { ...user };
  }

  saveUser(user: User) {
    if (!this.canManageUser(user.role)) {
      alert('You do not have permission to edit this user.');
      return;
    }

    this.isLoading = true;
    this.error = null;

    const updateRequest = {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };

    const xsrfToken = this.getXsrfToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': xsrfToken
    });

    this.http.put(`${this.apiUrl}/users/${user.id}`, updateRequest, {
      withCredentials: true,
      headers
    }).pipe(
      catchError(error => {
        console.error('[UserListComponent] Error updating user:', error);
        if (error.status === 401) {
          this.authService.logout();
          return throwError(() => new Error('Session expired. Please log in again.'));
        }
        return throwError(() => new Error('Failed to update user. Please try again.'));
      })
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          if (user.password && user.confirmPassword) {
            this.saveUserPassword(user);
          } else {
            this.finalizeSave(user);
          }
        } else {
          this.error = response.message || 'User update failed';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }

  private saveUserPassword(user: User) {
    if (user.password !== user.confirmPassword) {
      this.error = 'Passwords do not match';
      this.isLoading = false;
      return;
    }

    const passwordRequest = {
      newPassword: user.password,
      confirmPassword: user.confirmPassword
    };

    const xsrfToken = this.getXsrfToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': xsrfToken
    });

    this.http.put(`${this.apiUrl}/users/${user.id}/password`, passwordRequest, {
      withCredentials: true,
      headers
    }).pipe(
      catchError(error => {
        console.error('[UserListComponent] Error updating password:', error);
        if (error.status === 401) {
          this.authService.logout();
          return throwError(() => new Error('Session expired. Please log in again.'));
        }
        return throwError(() => new Error('Failed to update password. Please try again.'));
      })
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.finalizeSave(user);
        } else {
          this.error = response.message || 'Password update failed';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }

  private finalizeSave(user: User) {
    user.isEditing = false;
    delete user.originalData;
    delete user.password;
    delete user.confirmPassword;
    this.loadUsers();
  }

  cancelEditing(user: User) {
    if (user.originalData) {
      Object.assign(user, user.originalData);
      user.isEditing = false;
      delete user.originalData;
      delete user.password;
      delete user.confirmPassword;
    }
  }

  deleteUser(user: User) {
    if (!this.canManageUser(user.role)) {
      alert('You do not have permission to delete this user.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the user "${user.firstName} ${user.lastName}"?`)) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.authService.deleteUser(user.id).subscribe({
      next: () => {
        alert('User deleted successfully.');
        this.loadUsers();
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }

  toggleDisableUser(user: User) {
    if (!this.canManageUser(user.role)) {
      alert('You do not have permission to disable/enable this user.');
      return;
    }

    if (!confirm(`Are you sure you want to ${user.isDisabled ? 'enable' : 'disable'} "${user.firstName} ${user.lastName}"?`)) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    const xsrfToken = this.getXsrfToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-XSRF-TOKEN': xsrfToken
    });

    this.http.put(`${this.apiUrl}/users/${user.id}/disable`, {}, {
      withCredentials: true,
      headers
    }).pipe(
      catchError(error => {
        console.error('[UserListComponent] Error toggling disable status:', error);
        if (error.status === 401) {
          this.authService.logout();
          return throwError(() => new Error('Session expired. Please log in again.'));
        }
        if (error.status === 403) {
          return throwError(() => new Error('You do not have permission to disable users.'));
        }
        return throwError(() => new Error('Failed to update user status. Please try again.'));
      })
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Toggle locally in UI without reloading entire list
          user.isDisabled = response.isDisabled;

          const status = response.isDisabled ? 'disabled' : 'enabled';
          alert(`User successfully ${status}.`);
        } else {
          this.error = response.message || 'Failed to update user status.';
        }
      },
      error: (err) => {
        this.error = err.message;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  debugCurrentUser() {
    this.http.get(`${this.apiUrl}/me`, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Accept': 'application/json'
      })
    }).subscribe({
      next: (response) => console.log('[UserListComponent] Current user:', response),
      error: (err) => console.error('[UserListComponent] Error checking current user:', err)
    });
  }
}