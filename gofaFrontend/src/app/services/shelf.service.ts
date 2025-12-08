import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Shelf } from '../model/shelf.model';
import { environment } from '../../environments/environment'; // ✅ Import environment

@Injectable({
  providedIn: 'root'
})
export class ShelfService {
  private apiUrl = `${environment.apiBaseUrl}/api/Shelves`; // ✅ Use dynamic base URL

  constructor(private http: HttpClient) {}

  // Get all shelves
  getShelves(): Observable<Shelf[]> {
    return this.http.get<Shelf[]>(this.apiUrl).pipe(
      tap(shelves => console.log('Raw shelves from API:', shelves)),
      catchError(this.handleError)
    );
  }

  // Get shelf by ID
  getShelf(shelfId: string): Observable<Shelf> {
    return this.http.get<Shelf>(`${this.apiUrl}/${shelfId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Create a new shelf
  createShelf(shelf: Partial<Shelf>): Observable<Shelf> {
    console.log('Sending shelf data:', shelf);
    return this.http.post<Shelf>(this.apiUrl, shelf, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Update a shelf
  updateShelf(shelfId: string, shelf: Shelf): Observable<any> {
    return this.http.put(`${this.apiUrl}/${shelfId}`, shelf).pipe(
      catchError(this.handleError)
    );
  }

  // Delete a shelf
  deleteShelf(shelfId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${shelfId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server error: Status ${error.status}, Message: ${error.message}`;
      if (error.error) {
        errorMessage += `, Details: ${JSON.stringify(error.error)}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
