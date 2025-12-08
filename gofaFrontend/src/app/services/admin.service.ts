import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UserRolesViewModel } from '../model/user-roles-view-model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = environment.apiBaseUrl; // Replace <port> with your backend port

  constructor(private http: HttpClient) {}

  /**
   * Get all users with their roles.
   */
  getAllUsers(): Observable<UserRolesViewModel[]> {
    return this.http.get<UserRolesViewModel[]>(`${this.apiUrl}/admin/users`).pipe(
      tap((data) => console.log('All users:', data)),
      catchError(this.handleError)
    );
  }

  /**
   * Remove a user by ID.
   * @param userId The ID of the user to remove.
   */
  removeUser(userId: string): Observable<any> {
    const url = `${this.apiUrl}/remove-user/${userId}`;
    return this.http.delete(url).pipe(
      tap(() => console.log(`Deleted user with ID: ${userId}`)),
      catchError(this.handleError)
    );
  }

  /**
   * Update user roles.
   * @param userId The ID of the user.
   * @param roles The list of roles to assign to the user.
   */
  updateUserRoles(userId: string, roles: string[]): Observable<any> {
    const url = `${this.apiUrl}/update-roles`;
    const body = { UserId: userId, Roles: roles };
    return this.http.put(url, body).pipe(
      tap(() => console.log(`Updated roles for user with ID: ${userId}`)),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors.
   * @param error The error response.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => errorMessage);
  }
}