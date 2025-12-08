import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MaintenanceRequestService {
  private apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;

  constructor(private http: HttpClient) {}

  /** ================= GET MAINTENANCE REQUESTS ================= */
  // Supports optional pagination; if no page/pageSize provided, fetches all
  getMaintenanceRequests(page?: number, pageSize?: number): Observable<any> {
    let url = this.apiUrl;

    if (page !== undefined && pageSize !== undefined) {
      url += `?page=${page}&pageSize=${pageSize}`;
    }

    return this.http.get<any>(url).pipe(
      catchError((error) => {
        console.error('Error fetching maintenance requests:', error);
        return throwError(() => new Error('Failed to fetch maintenance requests.'));
      })
    );
  }

  /** ================= UPDATE MAINTENANCE REQUEST ================= */
  updateMaintenanceRequest(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data).pipe(
      catchError((error) => {
        console.error('Error updating maintenance request:', error);
        return throwError(() => new Error('Failed to update maintenance request.'));
      })
    );
  }

  /** ================= DELETE MAINTENANCE REQUEST ================= */
  deleteMaintenanceRequest(worksOrderNumber: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${worksOrderNumber}`).pipe(
      catchError((error) => {
        console.error('Error deleting maintenance request:', error);
        return throwError(() => new Error('Failed to delete maintenance request.'));
      })
    );
  }

  /** ================= GET DO-OUT REQUESTS ================= */
  getDoOutRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/status/do-out`).pipe(
      catchError((error) => {
        console.error('Error fetching do-out requests:', error);
        return throwError(() => new Error('Failed to fetch do-out requests.'));
      })
    );
  }
}
