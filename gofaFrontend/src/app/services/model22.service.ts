import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Model22, Model22Request, Model22Dto, ApiResponse, Model22WithAccessoriesRequest } from '../model/model22';

@Injectable({
  providedIn: 'root'
})
export class Model22Service {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/Model22`;

  constructor(private http: HttpClient) {}

  // Get all Model22 records, optionally filtered by role
  getModel22s(role?: string): Observable<Model22Dto[]> {
    const url = role ? `${this.apiUrl}?role=${encodeURIComponent(role)}` : this.apiUrl;
    return this.http.get<Model22Dto[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get a single Model22 record by ID, optionally filtered by role
  // In your model22.service.ts
 getModel22(id: number, role?: string): Observable<Model22Dto> {
    const url = role ? `${this.apiUrl}/${id}?role=${encodeURIComponent(role)}` : `${this.apiUrl}/${id}`;
    return this.http.get<Model22Dto>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('🔍 Model22 API Response:', {
          id: response.model22Id,
          itemsCount: response.items?.length,
          hasAccessories: response.items?.some(item => 
            item.withdrawnAccessories && item.withdrawnAccessories.length > 0
          ),
          itemsWithAccessories: response.items?.filter(item => 
            item.withdrawnAccessories && item.withdrawnAccessories.length > 0
          ).map(item => ({
            description: item.description,
            accessoriesCount: item.withdrawnAccessories?.length
          }))
        });
      }),
      catchError(this.handleError)
    );
  }


  // Create a new Model22 record
  create(model22: any): Observable<ApiResponse<{ model22Id: number }>> {
    const url = `${this.apiUrl}`;
    console.log('Sending POST to:', url);
    console.log('Payload:', model22);
    
    return this.http.post<ApiResponse<{ model22Id: number }>>(
      url,
      model22,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError((error) => {
        console.error('API Error:', error);
        return throwError(() => error);
      })
    );
  }

  // Update an existing Model22 record
  update(id: number, model22: Model22Request): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/${id}`,
      model22,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  generateVoucherNumber(): Observable<string> {
    return of('');
  }

  createWithAccessories(request: Model22WithAccessoriesRequest): Observable<ApiResponse<{ model22Id: number }>> {
    const url = `${this.apiUrl}/with-accessories`;
    console.log('📤 Sending POST to:', url);
    console.log('📤 Payload structure:', {
      voucherNumber: request.voucherNumber,
      itemsCount: request.items.length,
      itemsWithAccessories: request.items.filter(item => 
        item.selectedAccessories && item.selectedAccessories.length > 0
      ).length
    });
    console.log('📤 Full payload:', JSON.stringify(request, null, 2));
    
    return this.http.post<ApiResponse<{ model22Id: number }>>(
      url,
      request,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        console.log('📥 Received response from /with-accessories:', response);
      }),
      catchError((error) => {
        console.error('❌ API Error from /with-accessories:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete a Model22 record
  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/${id}`,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get Model22 records by roles
  getModel22sByRoles(roles: string[]): Observable<Model22Dto[]> {
    const queryParams = roles.map(role => `roles=${encodeURIComponent(role)}`).join('&');
    const url = `${this.apiUrl}/by-roles?${queryParams}`;
    return this.http.get<Model22Dto[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get current Ethiopian date
  getCurrentEthiopianDate(): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/date`, {
      headers: this.getHeaders(),
      withCredentials: true,
      responseType: 'text' as 'json'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get filtered Model22 records
  getFilteredModel22s(search?: string, period?: string, roles?: string[]): Observable<Model22Dto[]> {
    let url = `${this.apiUrl}/filter`;
    const queryParams: string[] = [];

    if (search) {
      queryParams.push(`search=${encodeURIComponent(search)}`);
    }
    if (period) {
      queryParams.push(`period=${encodeURIComponent(period)}`);
    }
    if (roles && roles.length > 0) {
      roles.forEach(role => queryParams.push(`roles=${encodeURIComponent(role)}`));
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    return this.http.get<Model22Dto[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': this.getXsrfToken()
    });
  }

  private getXsrfToken(): string {
    const name = 'XSRF-TOKEN';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return '';
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server error: Status ${error.status}`;
      if (error.error?.detailedMessage) {
        errorMessage += ` - ${error.error.detailedMessage}`;
      } else if (error.error?.message) {
        errorMessage += ` - ${error.error.message}`;
      } else if (error.message) {
        errorMessage += ` - ${error.message}`;
      }
      if (error.error?.errors) {
        errorMessage += `; Errors: ${JSON.stringify(error.error.errors)}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}