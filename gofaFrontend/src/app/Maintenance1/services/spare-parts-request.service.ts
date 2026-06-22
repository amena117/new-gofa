import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SParePartsRequest } from '../Models/SParePartsRequest';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SParePartsRequestService {
  private apiUrl = `${environment.apiBaseUrl}/api/SParePartsRequest`;

  constructor(private http: HttpClient) {}

  /** ================= GET ALL SPARE PARTS REQUESTS ================= */
  getSparePartsRequests(): Observable<SParePartsRequest[]> {
    return this.http.get<SParePartsRequest[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching spare parts requests:', error);
        return throwError(() => new Error('Failed to fetch spare parts requests.'));
      })
    );
  }

  /** ================= GET SINGLE SPARE PART REQUEST BY ID ================= */
  getSparePartsRequestById(id: number): Observable<SParePartsRequest> {
    return this.http.get<SParePartsRequest>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching spare parts request with ID ${id}:`, error);
        return throwError(() => new Error('Failed to fetch spare parts request.'));
      })
    );
  }

  /** ================= CREATE NEW SPARE PART REQUEST ================= */
  createSparePartsRequest(data: SParePartsRequest): Observable<SParePartsRequest> {
    return this.http.post<SParePartsRequest>(this.apiUrl, data).pipe(
      catchError((error) => {
        console.error('Error creating spare parts request:', error);
        return throwError(() => new Error('Failed to create spare parts request.'));
      })
    );
  }

  /** ================= UPDATE SPARE PART REQUEST ================= */
  updateSparePartsRequest(id: number, data: SParePartsRequest): Observable<SParePartsRequest> {
    return this.http.put<SParePartsRequest>(`${this.apiUrl}/${id}`, data).pipe(
      catchError((error) => {
        console.error(`Error updating spare parts request with ID ${id}:`, error);
        return throwError(() => new Error('Failed to update spare parts request.'));
      })
    );
  }

  /** ================= DELETE SPARE PART REQUEST ================= */
  deleteSparePartsRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error deleting spare parts request with ID ${id}:`, error);
        return throwError(() => new Error('Failed to delete spare parts request.'));
      })
    );
  }

  /** ================= ROUTE TO TEAM LEADER ================= */
  routeToTeamLeader(id: number, approvedBy: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/route-to-team-leader/${id}`, { approvedBy }).pipe(
      catchError((error) => {
        console.error(`Error routing request with ID ${id}:`, error);
        return throwError(() => new Error('Failed to route request to team leader.'));
      })
    );
  }

  /** ================= GET BY CURRENT STAGE ================= */
  getByCurrentStage(stage: string): Observable<SParePartsRequest[]> {
    return this.http.get<SParePartsRequest[]>(`${this.apiUrl}/by-current-stage/${stage}`).pipe(
      catchError((error) => {
        console.error(`Error fetching requests by stage ${stage}:`, error);
        return throwError(() => new Error('Failed to fetch requests by stage.'));
      })
    );
  }
}
