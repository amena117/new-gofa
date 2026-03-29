import { HttpClient, HttpErrorResponse,HttpParams } from '@angular/common/http';
import { Observable, throwError as observableThrowError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MasterCardItem,MasterCardItemReceived,MasterCardItemIssued,RequestOrderForIssue,RequestOrderReportFilter, RequestOrderReportResponse } from '../Mastercard/models/mastercard.model';
import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root',
})
export class RequestService {
  getOrganizations() {
    throw new Error('Method not implemented.');
  }
  constructor(private http: HttpClient) {}

  private mockItems: MasterCardItem[] = [];
  private apiUrl =  `${environment.apiBaseUrl}/api/RequestOrderForIssue`;



  getRequestOrders(): Observable<RequestOrderForIssue[]> {
    return this.http.get<RequestOrderForIssue[]>(`${this.apiUrl}`);
  }

  getRequestOrder(id: number): Observable<RequestOrderForIssue> {
    return this.http.get<RequestOrderForIssue>(`${this.apiUrl}/${id}`);
  }

  createRequestOrder(requestOrder: RequestOrderForIssue): Observable<RequestOrderForIssue> {
    return this.http.post<RequestOrderForIssue>(`${this.apiUrl}`, requestOrder); // Fix the endpoint
  }
//   deleteItem(itemId: string): Observable<any> {
//     return this.http.delete(`${this.apiUrl}/${itemId}`);
//   }

 // Add this method for updating
  updateRequestOrder(id: number, order: RequestOrderForIssue): Observable<RequestOrderForIssue> {
    return this.http.put<RequestOrderForIssue>(`${this.apiUrl}/${id}`, order);
  }

  getRequestOrdersReport(filter: RequestOrderReportFilter): Observable<RequestOrderReportResponse> {
    const url = `${this.apiUrl}/report`;
    let params = new HttpParams();
    if (filter.startDate) {
      params = params.set('startDate', new Date(filter.startDate).toISOString().split('T')[0]);
    }
    if (filter.endDate) {
      params = params.set('endDate', new Date(filter.endDate).toISOString().split('T')[0]);
    }
    if (filter.requestingUnit) {
      params = params.set('requestingUnit', filter.requestingUnit.trim());
    }
    if (filter.issuingStore) {
      params = params.set('issuingStore', filter.issuingStore.trim());
    }
    if (filter.category) {
      params = params.set('category', filter.category.trim());
    }
    if (filter.makeAndModel) {
      params = params.set('makeAndModel', filter.makeAndModel.trim());
    }
    if (filter.stockNumber) {
      params = params.set('stockNumber', filter.stockNumber.trim());
    }
    if (filter.description) {
      params = params.set('description', filter.description.trim());
    }

    console.log('RequestOrders Report API Request:', { url, params: params.toString() });

    return this.http.get<RequestOrderReportResponse>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`).pipe(
      catchError(this.handleError)
    );
  }

  getMakeAndModels(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/makeAndModels`).pipe(
      catchError(this.handleError)
    );
  }

  // ✅ CORRECTED METHODS
acceptRequestOrder(id: number): Observable<RequestOrderForIssue> {
  return this.http.post<RequestOrderForIssue>(`${this.apiUrl}/${id}/accept`, {}).pipe(
    catchError(this.handleError)
  );
}

rejectRequestOrder(id: number): Observable<RequestOrderForIssue> {
  return this.http.post<RequestOrderForIssue>(`${this.apiUrl}/${id}/reject`, {}).pipe(
    catchError(this.handleError)
  );
}
   private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('API Error:', error);
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return observableThrowError(() => new Error(errorMessage));
  }



}
