import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SpecialToolsRegister } from '../Models/special-tools-register';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SpecialToolsRegisterService {
  private apiUrl = `${environment.apiBaseUrl}/api/SpecialToolRegister`;

  constructor(private http: HttpClient) {}

  /** ================= GET ALL RECORDS ================= */
  getSpecialToolsRegisters(): Observable<SpecialToolsRegister[]> {
    return this.http.get<SpecialToolsRegister[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching special tools registers:', error);
        return throwError(() => new Error('Failed to fetch special tools registers.'));
      })
    );
  }

  /** ================= GET SINGLE RECORD BY ID ================= */
  getSpecialToolsRegisterById(id: number): Observable<SpecialToolsRegister> {
    return this.http.get<SpecialToolsRegister>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching special tools register with ID ${id}:`, error);
        return throwError(() => new Error('Failed to fetch special tools register.'));
      })
    );
  }

  /** ================= CREATE NEW RECORD ================= */
  createSpecialToolsRegister(data: SpecialToolsRegister): Observable<SpecialToolsRegister> {
    return this.http.post<SpecialToolsRegister>(this.apiUrl, data).pipe(
      catchError((error) => {
        console.error('Error creating special tools register:', error);
        return throwError(() => new Error('Failed to create special tools register.'));
      })
    );
  }

  /** ================= UPDATE RECORD ================= */
  updateSpecialToolsRegister(id: number, data: SpecialToolsRegister): Observable<SpecialToolsRegister> {
    return this.http.put<SpecialToolsRegister>(`${this.apiUrl}/${id}`, data).pipe(
      catchError((error) => {
        console.error(`Error updating special tools register with ID ${id}:`, error);
        return throwError(() => new Error('Failed to update special tools register.'));
      })
    );
  }

  /** ================= DELETE RECORD ================= */
  deleteSpecialToolsRegister(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error deleting special tools register with ID ${id}:`, error);
        return throwError(() => new Error('Failed to delete special tools register.'));
      })
    );
  }

  /** ================= UPDATE RETURNED DATE ================= */
  updateReturnedDate(id: number, returnedDate: Date): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/returnedDate`, { returnedDate }).pipe(
      catchError((error) => {
        console.error(`Error updating returned date for ID ${id}:`, error);
        return throwError(() => new Error('Failed to update returned date.'));
      })
    );
  }
}
