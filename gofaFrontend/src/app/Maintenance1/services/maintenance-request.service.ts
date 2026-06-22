import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MaintenanceRequestService {
  private apiUrl = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;
  private equipmentUrl = `${environment.apiBaseUrl}/api/EquipmentType`;
  private letterUrl = `${environment.apiBaseUrl}/api/LetterRegistration`;

  private refreshNotificationsSource = new Subject<void>();
  refreshNotifications$ = this.refreshNotificationsSource.asObservable();

  triggerNotificationsRefresh() {
    this.refreshNotificationsSource.next();
  }

  constructor(private http: HttpClient) {}

  getMaintenanceRequests(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getMaintenanceRequestById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getMaintenanceRequestByWorksOrder(worksOrderNumber: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-worksorder/${worksOrderNumber}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  submitMaintenanceRequest(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  updateMaintenanceRequestById(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  updateMaintenanceRequest(worksOrderNumber: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${worksOrderNumber}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  /** Update maintenance details when technician finishes (maintain form) */
  updateMaintenanceDetails(worksOrderNumber: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-maintenance/${worksOrderNumber}`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deleteMaintenanceRequest(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getFinishedRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/finished`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getDoOutRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/status/do-out`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getRequestsByStatus(status: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/by-status/${encodeURIComponent(status)}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getEquipmentTypes(): Observable<any[]> {
    return this.http.get<any[]>(this.equipmentUrl).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getInitialLetters(): Observable<any[]> {
    return this.http.get<any[]>(this.letterUrl).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getLetters(): Observable<any[]> {
    return this.http.get<any[]>(this.letterUrl).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deleteLetter(id: number): Observable<any> {
    return this.http.delete(`${this.letterUrl}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deliverToClient(worksOrderNumber: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/deliver/${worksOrderNumber}`, data, { responseType: 'text' }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  qualifyRequest(worksOrderNumber: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/qualify/${worksOrderNumber}`, {}, { responseType: 'text' }).pipe(
      catchError(err => throwError(() => err))
    );
  }

  generateReport(startDate: string, endDate: string, interval?: string, role?: string): Observable<any> {
    let url = `${this.apiUrl}/report?startDate=${startDate}&endDate=${endDate}`;
    if (interval) url += `&interval=${interval}`;
    if (role) url += `&role=${role}`;
    return this.http.get<any>(url).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
