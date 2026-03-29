import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { take } from 'rxjs/operators';

interface LoginRequest {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginModel: LoginRequest = { username: '', password: '' };
  isLoading: boolean = false;
  errorMessage: string = '';
  showPassword: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.isLoading = true;
    this.errorMessage = '';

    // Basic frontend validation
    if (!this.loginModel.username || !this.loginModel.password) {
      this.errorMessage = 'Username and password are required.';
      this.isLoading = false;
      return;
    }

    // Call AuthService to log in
    this.authService.login(this.loginModel.username, this.loginModel.password)
      .pipe(take(1))
      .subscribe({
        next: () => {
          console.log('Login successful');
          this.isLoading = false;
          this.resetForm();
        },
        error: (error) => {
          console.error('Login failed', error);
          this.isLoading = false;
          this.errorMessage = error.message || 'Invalid credentials or server error.';
        }
      });
  }

  private resetForm() {
    this.loginModel = { username: '', password: '' };
  }
}