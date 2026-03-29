import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Letter } from '../Maintenance/Models/letter.model';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceRequestService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /** ================= EQUIPMENT ================== */
  getEquipmentTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/EquipmentTypes`).pipe(
      catchError(err => {
        console.error('Error fetching equipment types:', err);
        return throwError(() => new Error('Failed to fetch equipment types.'));
      })
    );
  }

  /** ================= MAINTENANCE ================== */
  getMaintenanceRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/MaintenanceRequestRegister`).pipe(
      catchError(err => {
        console.error('Error fetching maintenance requests:', err);
        return throwError(() => new Error('Failed to fetch maintenance requests.'));
      })
    );
  }

  getDoOutRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/MaintenanceRequestRegister/status/do-out`).pipe(
      catchError(err => {
        console.error('Error fetching do-out requests:', err);
        return throwError(() => new Error('Failed to fetch do-out requests.'));
      })
    );
  }

  getPendingDeliveries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/MaintenanceRequestRegister/pending-delivery`).pipe(
      catchError(err => {
        console.error('Error fetching pending deliveries:', err);
        return throwError(() => new Error('Failed to fetch pending deliveries.'));
      })
    );
  }

  getByStatus(status: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/MaintenanceRequestRegister/by-status/${status}`).pipe(
      catchError(err => {
        console.error('Error fetching requests by status:', err);
        return throwError(() => new Error('Failed to fetch requests by status.'));
      })
    );
  }

  updateMaintenanceStatus(worksOrderNumber: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/update-status/${worksOrderNumber}`, { status }).pipe(
      catchError(err => {
        console.error('Error updating maintenance status:', err);
        return throwError(() => new Error('Failed to update maintenance status.'));
      })
    );
  }

  getMaintenanceRequestById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/${id}`).pipe(
      catchError(err => {
        console.error('Error fetching maintenance request by ID:', err);
        return throwError(() => new Error('Failed to fetch maintenance request.'));
      })
    );
  }

  getMaintenanceRequestByWorksOrder(worksOrderNumber: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/by-worksorder/${worksOrderNumber}`).pipe(
      catchError(err => {
        console.error('Error fetching maintenance request by works order:', err);
        return throwError(() => new Error('Failed to fetch maintenance request.'));
      })
    );
  }

  submitMaintenanceRequest(requestData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/MaintenanceRequestRegister`, requestData).pipe(
      catchError(err => {
        console.error('Error submitting maintenance request:', err);
        return throwError(() => new Error('Failed to submit maintenance request.'));
      })
    );
  }

  updateMaintenanceRequest(worksOrderNumber: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/update/${worksOrderNumber}`, data).pipe(
      catchError(err => {
        console.error('Error updating maintenance request:', err);
        return throwError(() => new Error('Failed to update maintenance request.'));
      })
    );
  }

  updateMaintenanceRequestById(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/${id}`, data).pipe(
      catchError(err => {
        console.error('Error updating maintenance request by ID:', err);
        return throwError(() => new Error('Failed to update maintenance request.'));
      })
    );
  }

  deleteMaintenanceRequest(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/${id}`).pipe(
      catchError(err => {
        console.error('Error deleting maintenance request:', err);
        return throwError(() => new Error('Failed to delete maintenance request.'));
      })
    );
  }

  updateMaintenanceOnly(worksOrderNumber: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/api/MaintenanceRequestRegister/update-maintenance-only/${worksOrderNumber}`, data).pipe(
      catchError(err => {
        console.error('Error updating maintenance only:', err);
        return throwError(() => new Error('Failed to update maintenance only.'));
      })
    );
  }

  /** ================= LETTERS ================== */
  getLetters(): Observable<Letter[]> {
    return this.http.get<Letter[]>(`${this.apiUrl}/api/LetterRegistration`).pipe(
      catchError(err => {
        console.error('Error fetching letters:', err);
        return throwError(() => new Error('Failed to fetch letters.'));
      })
    );
  }

  getInitialLetters(): Observable<Letter[]> {
    return this.http.get<Letter[]>(`${this.apiUrl}/api/LetterRegistration/initial`).pipe(
      catchError(err => {
        console.error('Error fetching initial letters:', err);
        return throwError(() => new Error('Failed to fetch initial letters.'));
      })
    );
  }

  getLetterById(id: number): Observable<Letter> {
    return this.http.get<Letter>(`${this.apiUrl}/api/LetterRegistration/${id}`).pipe(
      catchError(err => {
        console.error('Error fetching letter by ID:', err);
        return throwError(() => new Error('Failed to fetch letter.'));
      })
    );
  }

  createLetter(letter: Letter): Observable<Letter> {
    return this.http.post<Letter>(`${this.apiUrl}/api/LetterRegistration`, letter).pipe(
      catchError(err => {
        console.error('Error creating letter:', err);
        return throwError(() => new Error('Failed to create letter.'));
      })
    );
  }

  updateLetter(id: number, letter: Letter): Observable<Letter> {
    return this.http.put<Letter>(`${this.apiUrl}/api/LetterRegistration/${id}`, letter).pipe(
      catchError(err => {
        console.error('Error updating letter:', err);
        return throwError(() => new Error('Failed to update letter.'));
      })
    );
  }

  deleteLetter(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/api/LetterRegistration/${id}`).pipe(
      catchError(err => {
        console.error('Error deleting letter:', err);
        return throwError(() => new Error('Failed to delete letter.'));
      })
    );
  }
}
