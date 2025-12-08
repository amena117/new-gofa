import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Warehouse } from '../model/warehouse.model'; // Adjust the path as needed
import { environment } from '../../environments/environment'; // Import the environment file
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = `${environment.apiBaseUrl}/api/warehouses`; // Use environment.apiBaseUrl directly

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Create a new warehouse
  createWarehouse(warehouse: Warehouse): Observable<any> {
    return this.http.post<any>(this.apiUrl, warehouse, {
      withCredentials: true,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get all warehouses
  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(this.apiUrl, {
      withCredentials: true,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get a single warehouse by ID
  getWarehouseById(id: string): Observable<Warehouse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Warehouse>(url, {
      withCredentials: true,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Update a warehouse
  updateWarehouse(id: string, warehouse: Warehouse): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<any>(url, warehouse, {
      withCredentials: true,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Delete a warehouse
  deleteWarehouse(id: string): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<any>(url, {
      withCredentials: true,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    console.error('Warehouse service error:', error);
    
    if (error.status === 401) {
      // Handle unauthorized error
      this.authService.logout();
      return throwError(() => new Error('Session expired. Please log in again.'));
    }
    
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      return throwError(() => new Error('Network error occurred. Please check your connection.'));
    }
    
    // Server-side error
    const errorMessage = error.error?.message || 'An error occurred while processing your request.';
    return throwError(() => new Error(errorMessage));
  }
}