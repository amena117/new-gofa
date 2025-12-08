/ src/app/services/model22.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Model22 } from '../model/model22';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; // Add this import

@Injectable({
  providedIn: 'root',
})
export class Model22Service {
  private apiUrl = `${environment.apiBaseUrl}/api/Model22`;

  constructor(
    private http: HttpClient,
    private authService: AuthService // Inject AuthService
  ) {}

  // Get all Model22 entities filtered by user role
  getAll(): Observable<Model22[]> {
    const role = this.authService.getRole();
    return this.http.get<Model22[]>(`${this.apiUrl}?role=${role}`);
  }

  // Get a single Model22 entity by ID (with role check)
  getById(id: number): Observable<Model22> {
    const role = this.authService.getRole();
    return this.http.get<Model22>(`${this.apiUrl}/${id}?role=${role}`);
  }

  // Create a new Model22 entity with role automatically set
  create(model22: Model22): Observable<Model22> {
    const role = this.authService.getRole();
    const model22WithRole = { ...model22, role };
    return this.http.post<Model22>(this.apiUrl, model22WithRole);
  }

  // Update an existing Model22 entity with role check
  update(id: number, model22: Model22): Observable<Model22> {
    const role = this.authService.getRole();
    return this.http.put<Model22>(`${this.apiUrl}/${id}?role=${role}`, model22);
  }

  // Delete a Model22 entity with role check
  delete(id: number): Observable<void> {
    const role = this.authService.getRole();
    return this.http.delete<void>(`${this.apiUrl}/${id}?role=${role}`);
  }

  // Consolidated methods (you can keep these or remove duplicates)
  createModel22(model22: Model22): Observable<Model22> {
    return this.create(model22); // Uses the updated create method
  }

  getModel22List(): Observable<Model22[]> {
    return this.getAll(); // Uses the updated getAll method
  }

  getModel22ById(id: number): Observable<Model22> {
    return this.getById(id); // Uses the updated getById method
  }

  updateModel22(id: number, model22: Model22): Observable<Model22> {
    return this.update(id, model22); // Uses the updated update method
  }

  deleteModel22(id: number): Observable<void> {
    return this.delete(id); // Uses the updated delete method
  }

  getAllModel22(): Observable<Model22[]> {
    return this.getAll().pipe(
      catchError(this.handleError)
    );
  }

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
    return throwError(() => new Error(errorMessage));
  }
}