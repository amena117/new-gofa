import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: false
})
export class RegisterComponent implements OnInit {
  @Output() registerSuccess = new EventEmitter<void>();
  @Output() errorOccurred = new EventEmitter<{ field: string; message: string }[]>();

  registerModel: RegisterRequest = {
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: ''
  };

  // All available roles for SUPER_ADMIN
  allAvailableRoles = [
    'VHF', 'HF', 'ELECTRONICS', 'SPAREPART', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 
    'PROPERTY_CONTROL_TEAMLEADER', 'PROPERTY_CONTROL', 'SUPPLY_AND_DISTRIBUTION_HEAD',
    'TRANSIT', 'PPC', 'POWER', 'QUALITY', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE', 
    'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE',
    'VHF_RADIO', 'HF_RADIO', 'COMPUTER_MAINTENANCE', 'IT_MAINTENANCE',
    'ELECTRONICS_PTEAM', 'ELECTRONICS_HTEAM', 'MINISTORE', 'RADIO', 'SUPER_ADMIN', 
    'MAINTENANCE_LEADER', 'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER',
    'SANDD_ADMIN', 'MAINTENANCE_ADMIN', 'MAINTENANCE_REPORTING'
  ];

  // Roles that SANDD_ADMIN can assign
  sandDRoles = [
    'VHF', 'HF', 'ELECTRONICS', 'SPAREPART', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 
    'PROPERTY_CONTROL_TEAMLEADER', 'PROPERTY_CONTROL', 'SUPPLY_AND_DISTRIBUTION_HEAD',
    'TRANSIT'
  ];

  // Roles that MAINTENANCE_ADMIN can assign
  maintenanceRoles = [
    'PPC', 'POWER', 'QUALITY', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE', 
    'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE',
    'VHF_RADIO', 'HF_RADIO', 'COMPUTER_MAINTENANCE', 'IT_MAINTENANCE',
    'ELECTRONICS_PTEAM', 'ELECTRONICS_HTEAM', 'MINISTORE', 'RADIO', 
    'MAINTENANCE_LEADER', 'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER',
    'MAINTENANCE_REPORTING'
  ];

  availableRoles: string[] = [];
  private apiUrl = `${environment.apiBaseUrl}/api/auth`;
  currentUserRole: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();
    
    // Check if user is any type of admin
    if (!this.authService.isAnyAdmin()) {
      alert('Access denied. Only administrators can register users.');
      this.router.navigate(['/users']);
      return;
    }

    // Set available roles based on admin type
    this.setAvailableRoles();
  }

  private setAvailableRoles(): void {
    const role = this.currentUserRole;
    
    if (role === 'SUPER_ADMIN') {
      // SUPER_ADMIN can create any role except SUPER_ADMIN
      this.availableRoles = this.allAvailableRoles.filter(r => r !== 'SUPER_ADMIN');
    } else if (role === 'SANDD_ADMIN') {
      // SANDD_ADMIN can only create S&D roles
      this.availableRoles = [...this.sandDRoles];
    } else if (role === 'MAINTENANCE_ADMIN') {
      // MAINTENANCE_ADMIN can only create maintenance roles
      this.availableRoles = [...this.maintenanceRoles];
    } else {
      this.availableRoles = [];
    }
  }

  /** Human-readable label for a role value */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      VHF_RADIO:            'VHF Maintenance',
      HF_RADIO:             'HF Maintenance',
      COMPUTER_MAINTENANCE: 'Computer Maintenance',
      IT_MAINTENANCE:       'IT Maintenance',
      OFFICE_MACHINE:       'Office Machine Maintenance',
    };
    return labels[role] ?? role;
  }

  get hasPasswordError(): boolean {
    const pwd = this.registerModel.password;
    return (
      !!pwd &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\-=`]).{6,}$/.test(pwd)
    );
  }

  onRegister() {
    const {
      firstName,
      lastName,
      username,
      password,
      confirmPassword,
      role
    } = this.registerModel;

    if (!firstName || !lastName || !username || !password || !confirmPassword || !role) {
      alert('All fields are required.');
      return;
    }

    // Validate if the current admin can assign this role
    if (!this.canAssignRole(role)) {
      alert('You do not have permission to assign this role.');
      return;
    }

    if (username.length < 4 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      alert('Username must be at least 4 characters and contain only letters, numbers, or underscores.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\-=`]).{6,}$/;
    if (!passwordRegex.test(password)) {
      alert(
        'Password must:\n' +
        '- Be at least 6 characters\n' +
        '- Contain at least one uppercase letter\n' +
        '- Contain at least one lowercase letter\n' +
        '- Contain at least one number\n' +
        '- Contain at least one special character'
      );
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    console.log('Register Request Payload:', this.registerModel);

    this.http.post<any>(`${this.apiUrl}/register`, this.registerModel, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).subscribe({
      next: (response) => {
        console.log('Register Response:', response);
        if (response.success) {
          this.registerSuccess.emit();
          this.resetForm();
          this.router.navigate(['/users']);
        } else {
          alert(response.message || 'Registration failed');
        }
      },
      error: (error) => {
        console.error('Register Error:', error);
        if (error.status === 401) {
          this.authService.logout();
          alert('Session expired. Please log in again.');
          this.router.navigate(['/login']);
        } else {
          this.handleError(error);
        }
      }
    });
  }

  private canAssignRole(role: string): boolean {
    const currentRole = this.currentUserRole;
    
    if (currentRole === 'SUPER_ADMIN') {
      // SUPER_ADMIN can assign any role except SUPER_ADMIN
      return role !== 'SUPER_ADMIN';
    }
    
    if (currentRole === 'SANDD_ADMIN') {
      // SANDD_ADMIN can only assign S&D roles
      return this.sandDRoles.includes(role);
    }
    
    if (currentRole === 'MAINTENANCE_ADMIN') {
      // MAINTENANCE_ADMIN can only assign maintenance roles
      return this.maintenanceRoles.includes(role);
    }
    
    return false;
  }

  private handleError(error: any) {
    const errors = error.status === 400 && error.error.errors
      ? error.error.errors
      : [{ field: '', message: error.error?.message || 'An unexpected error occurred' }];
    console.log('Error Details:', errors);
    alert(errors.map((e: { message: string }) => e.message).join('\n'));
    this.errorOccurred.emit(errors);
  }

  private resetForm() {
    this.registerModel = {
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: ''
    };
  }
}