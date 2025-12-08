import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError as observableThrowError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MasterCardItem,MasterCardItemReceived,MasterCardItemIssued,RequestOrderForIssue, MasterCardItemsReportFilter, MasterCardItemsReportResponse } from '../Mastercard/models/mastercard.model';
import { Injectable } from '@angular/core';

export interface Organization {
  id: number;
  name: string;
}

export interface Location {
  id: number;
  name: string;
}


export interface DashboardStats {
  registeredItems: number;
  totalReceived: number;
  totalIssued: number;
  totalInStock: number;
  requestOrdersCount: number;
  totalRequestedIssued: number;
}

export interface TopIssuedItem {
  id: number;
  model: string;
  totalIssued: number;
}

export interface MonthlyTrend {
  month: string;
  received: number;
  issued: number;
}




@Injectable({
  providedIn: 'root',
})
export class MasterCardService {
  constructor(private http: HttpClient) {}

  private mockItems: MasterCardItem[] = [];
  private apiUrl =  `${environment.apiBaseUrl}/api/MasterCardItems`;
  



  // addMasterCardItemDetails(itemId: number, details: MasterCardItemDetails): Observable<MasterCardItemDetails> {
  //   const url = `${this.apiUrl}/${itemId}/details`;
  //   return this.http.post<MasterCardItemDetails>(url, details);
  // }

  // // PATCH http://localhost:5131/api/MasterCardItems/{itemId}/details/{detailId}/receive
  // updateReceived(itemId: number, detailId: number, additionalReceived: number): Observable<MasterCardItemDetails> {
  //   const url = `${this.apiUrl}/${itemId}/details/${detailId}/receive`;
  //   return this.http.patch<MasterCardItemDetails>(url, additionalReceived);
  // }

  // POST http://localhost:5131/api/MasterCardItems/{itemId}/received
  addMasterCardItemReceived(itemId: number, received: MasterCardItemReceived): Observable<MasterCardItemReceived> {
    const url = `${this.apiUrl}/${itemId}/received`;
    return this.http.post<MasterCardItemReceived>(url, received);
  }

  addMasterCardItemIssued(itemId: number, issued: MasterCardItemIssued): Observable<MasterCardItemIssued> {
    const url = `${this.apiUrl}/${itemId}/issued`;
    return this.http.post<MasterCardItemIssued>(url, issued);
  }
 // GET http://localhost:5131/api/MasterCardItems/{id}
 getMasterCardItem(id: number): Observable<MasterCardItem> {
  const url = `${this.apiUrl}/${id}`;
  return this.http.get<MasterCardItem>(url);
}
  updateItem(id: string, updatedItem: any): Observable<any> {

    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, updatedItem).pipe(
      catchError((error) => {
        
        return throwError(() => new Error('Failed to update item'));
      })
    );

  }

  updateReceivedRecord(id: number, record: MasterCardItemReceived): Observable<MasterCardItemReceived> {
    return this.http.put<MasterCardItemReceived>(`${this.apiUrl}/received/${id}`, record);
  }

  updateIssuedRecord(id: number, record: MasterCardItemIssued): Observable<MasterCardItemIssued> {
    return this.http.put<MasterCardItemIssued>(`${this.apiUrl}/issued/${id}`, record);
  }
  updateMasterCardItem(id: number, item: MasterCardItem): Observable<MasterCardItem> {
    return this.http.put<MasterCardItem>(`${this.apiUrl}/${id}`, item);
  }
  updateProfile(id: number, profileData: any): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, profileData).pipe(
      catchError((error) => {
        
        return throwError(() => new Error('Failed to update profile'));
      })
    );
  }



  updateItemStatus(itemId: string, newStatus: MasterCardItem): Observable<MasterCardItem> {
    const url = `${this.apiUrl}/${itemId}`;



    return this.http.put<MasterCardItem>(url, newStatus, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getRequestOrders(): Observable<RequestOrderForIssue[]> {
    return this.http.get<RequestOrderForIssue[]>(`${this.apiUrl}/RequestOrderForIssue`);
  }

  getRequestOrder(id: number): Observable<RequestOrderForIssue> {
    return this.http.get<RequestOrderForIssue>(`${this.apiUrl}/RequestOrderForIssue/${id}`);
  }

  createRequestOrder(requestOrder: RequestOrderForIssue): Observable<RequestOrderForIssue> {
    return this.http.post<RequestOrderForIssue>(`${this.apiUrl}/RequestOrderForIssue`, requestOrder); // Fix the endpoint
  }
  deleteItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${itemId}`);
  }




  // Get items sent for inspection


  // Get notifications (items from inspection unit)


  sendToStore(item: MasterCardItem) {
        // return this.http.post<Item>(`${this.apiUrl}/send-to-store`, item);
      }



    sendToInspection(item: MasterCardItem): Observable<MasterCardItem> {
    return this.http.post<MasterCardItem>(`${this.apiUrl}`, item);
  }

  getMasterCards(): Observable<MasterCardItem[]> {
    return this.http.get<MasterCardItem[]>(`${this.apiUrl}`);
  }





  getItemById(id: string): Observable<MasterCardItem> {
    return this.http.get<MasterCardItem>(`${this.apiUrl}/${id}`);
  }

  // Save a new MasterCard
  saveMasterCard(masterCard: MasterCardItem): Observable<any> {
    return this.http.post<any>(this.apiUrl, masterCard);
  }

  // Get a MasterCard by ID (if needed for fetching data)
  // getMasterCardById(id: number): Observable<MasterCard> {
  //   return this.http.get<MasterCard>(`${this.apiUrl}/${id}`);
  // }

  // Call this after successfully adding a new card
  // addNewCard(card: MasterCardItem): void {
  //   this.newCardSubject.next(card);
  // }

  // Update an existing MasterCard (if needed for updates)
  // updateMasterCard(id: number, masterCard: MasterCard): Observable<any> {
  //   return this.http.put<any>(`${this.apiUrl}/${id}`, masterCard);
  // }

   // ✅ NEW: Get full item with received records and accessories
  getMasterCardItemWithReceived(id: number): Observable<MasterCardItem> {
    return this.http.get<MasterCardItem>(`${this.apiUrl}/${id}?include=received,issued`);
  }

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.apiUrl}/organizations`);
  }

  addOrganization(organization: Organization): Observable<Organization[]> {
    return this.http.post<Organization[]>(`${this.apiUrl}/organizations`, organization);
  }

  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.apiUrl}/locations`);
  }

  addLocation(location: Location): Observable<Location[]> {
    return this.http.post<Location[]>(`${this.apiUrl}/locations`, location);
  }

   // New Dashboard Methods
  // GET http://localhost:5131/api/MasterCardItems/stats
  getDashboardStats(): Observable<DashboardStats> {
    const url = `${this.apiUrl}/stats`;
    return this.http.get<DashboardStats>(url).pipe(
      catchError(this.handleError)
    );
  }

  // GET http://localhost:5131/api/MasterCardItems/topIssuedItems?limit=5
  getTopIssuedItems(limit: number = 5): Observable<TopIssuedItem[]> {
    const url = `${this.apiUrl}/topIssuedItems?limit=${limit}`;
    return this.http.get<TopIssuedItem[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  // GET http://localhost:5131/api/MasterCardItems/monthlyTrends?months=12
  getMonthlyTrends(months: number = 12): Observable<MonthlyTrend[]> {
    const url = `${this.apiUrl}/monthlyTrends?months=${months}`;
    return this.http.get<MonthlyTrend[]>(url).pipe(
      catchError(this.handleError)
    );
  }

   private handleError(error: HttpErrorResponse): Observable<never> {
    
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

  
// GET http://localhost:5131/api/MasterCardItems/report
  getReport(filter: MasterCardItemsReportFilter): Observable<MasterCardItemsReportResponse> {
    const url = `${this.apiUrl}/report`;
    let params = new HttpParams();
    if (filter.startDate) {
      // Ensure date is in ISO 8601 format (YYYY-MM-DD)
      params = params.set('startDate', new Date(filter.startDate).toISOString().split('T')[0]);
    }
    if (filter.endDate) {
      params = params.set('endDate', new Date(filter.endDate).toISOString().split('T')[0]);
    }
    if (filter.organization) {
      params = params.set('organization', filter.organization.trim());
    }
    if (filter.location) {
      params = params.set('location', filter.location.trim());
    }
    if (filter.model) {
      params = params.set('model', filter.model.trim());
    }
    if (filter.partNumber) {
      params = params.set('partNumber', filter.partNumber.trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status.trim());
    }
    params = params.set('includeAccessories', filter.includeAccessories ? 'true' : 'false');

    
    return this.http.get<MasterCardItemsReportResponse>(url, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // NEW: Get unique models
  getModels(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/models`).pipe(
      catchError(this.handleError)
    );
  }

  // NEW: Get unique part numbers
  getPartNumbers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/partNumbers`).pipe(
      catchError(this.handleError)
    );
  }

  // NEW: Get unique statuses
  getStatuses(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/statuses`).pipe(
      catchError(this.handleError)
    );
  }
 getCurrentDate(): Observable<{ date: string }> {
    return this.http.get<{ date: string }>(`${this.apiUrl}/current`).pipe(
      catchError(this.handleError)
    );
  }
   
}
function throwError(errorFactory: () => Error): Observable<never> {
  return observableThrowError(errorFactory());
}