import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WarehouseDto } from '../model/item.model'; // Adjust path if using warehouse.model.ts
import { environment } from '../../environments/environment'; // Import environment config
import { Warehouse } from '../model/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  // Base URL from environment, appended with '/warehouses' endpoint
  private apiUrl = `${environment.apiBaseUrl}/api/warehouses`;

  constructor(private http: HttpClient) {}

  // Get all warehouses
  getWarehouses(): Observable<Warehouse[]> {
    console.log('Fetching warehouses from:', this.apiUrl); // Debug log
    return this.http.get<Warehouse[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  // Get a single warehouse by ID
  getWarehouseById(id: string): Observable<Warehouse> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Warehouse>(url).pipe(
      catchError(this.handleError)
    );
  }

  // Create a new warehouse
  createWarehouse(warehouse: Warehouse): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.apiUrl, warehouse).pipe(
      catchError(this.handleError)
    );
  }

  // Update an existing warehouse
  updateWarehouse(id: string, warehouse: Warehouse): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<void>(url, warehouse).pipe(
      catchError(this.handleError)
    );
  }

  // Delete a warehouse
  deleteWarehouse(id: string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url).pipe(
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server error: Status ${error.status}, Message: ${error.message}`;
      if (error.error) {
        errorMessage += `, Details: ${JSON.stringify(error.error)}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}