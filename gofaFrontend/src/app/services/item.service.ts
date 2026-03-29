import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Item,
  ShelfDto,
  WarehouseDto,
  ItemReceiveRequest,
  BulkReceiveRequest,
  TransactionEntry,
  TransactionEntryDto,
  Category,
  AddItemQuantityRequest,
  BulkAddItemQuantityRequest,
  WithdrawHistoryDto,
  ReceiveHistoryDto,
  ApiResponse,
  WarehouseSummaryDto,
  UpdateItemRequest,
  DashboardItem
} from '../model/item.model';
import { AuthService } from './auth.service';

interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/items`;
  private readonly shelvesApiUrl = `${environment.apiBaseUrl}/api/shelves`;
  private readonly warehousesApiUrl = `${environment.apiBaseUrl}/api/warehouses`;
  private readonly categoriesApiUrl = `${environment.apiBaseUrl}/api/categories`;
  private readonly sourcesApiUrl = `${environment.apiBaseUrl}/api/sources`;
  private readonly antiforgeryUrl = `${environment.apiBaseUrl}/api/antiforgery/token`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getItems(search: string = ''): Observable<Item[]> {
    const url = search ? `${this.apiUrl}?description=${encodeURIComponent(search)}` : this.apiUrl;
    return this.http.get<Item[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(items => items.map(item => ({
        ...item,
        description: item.description || 'Unknown',
        category: item.category || 'Unknown',
        unitPrice: item.unitPrice ?? 0,
        currency: item.currency ?? 'ETB',
        source: item.source || 'Unknown',
        quantity: item.quantity,
        serialNumbers: item.serialNumbers ?? [],
        accessories: item.accessories || [],
        units: item.units || [],
        transactionHistory: item.transactionHistory || []
      }))),
      catchError(this.handleError)
    );
  }

  fetchXsrfToken(): Observable<any> {
    return this.http.get(this.antiforgeryUrl, { withCredentials: true }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(null);
        }
        return this.handleError(error);
      })
    );
  }

  getCurrencies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/currencies`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(['ETB', 'USD', 'EURO', 'POUND']);
        }
        return this.handleError(error);
      })
    );
  }

  getSources(): Observable<string[]> {
    return this.http.get<string[]>(this.sourcesApiUrl, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(['Purchase', 'Return', 'Donation', 'Transfer']);
        }
        return this.handleError(error);
      })
    );
  }

  getItemsByWarehouse(warehouseId: string, role?: string): Observable<Item[]> {
    let url = `${this.apiUrl}/by-warehouse/${warehouseId}`;
    if (role) {
      url += `?role=${encodeURIComponent(role)}`;
    }
    return this.http.get<Item[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(items => items.map(item => ({
        ...item,
        description: item.description || 'Unknown',
        category: item.category || 'Unknown',
        unitPrice: item.unitPrice ?? 0,
        currency: item.currency ?? 'ETB',
        source: item.source || 'Unknown',
        quantity: item.quantity,
        serialNumbers: item.serialNumbers ?? [],
        accessories: item.accessories || [],
        units: item.units || [],
        transactionHistory: item.transactionHistory || []
      }))),
      catchError(this.handleError)
    );
  }

  getItemsByRole(roles: string[] = ['VHF', 'HF', 'ELECTRONICS', 'SPAREPART']): Observable<Item[]> {
    const rolesQuery = roles.map(role => `roles=${encodeURIComponent(role)}`).join('&');
    const url = `${this.apiUrl}/by-roles?${rolesQuery}`;
    console.log(`🔍 Fetching items for roles: ${roles.join(', ')}`);
    console.log(`📡 Request URL: ${url}`);
    
    return this.http.get<Item[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(items => console.log(`✅ Received ${items.length} items for roles: ${roles.join(', ')}`)),
      map(items => items.map(item => ({
        ...item,
        description: item.description || 'Unknown',
        category: item.category || 'Unknown',
        unitPrice: item.unitPrice ?? 0,
        currency: item.currency ?? 'ETB',
        source: item.source || 'Unknown',
        role: item.role || 'Unknown',
        serialNumbers: item.serialNumbers ?? [],
        accessories: item.accessories || [],
        units: item.units || [],
        transactionHistory: item.transactionHistory || []
      }))),
      catchError(error => {
        console.error(`❌ Error fetching items for roles ${roles.join(', ')}:`, error);
        return this.handleError(error);
      })
    );
  }
  getDashboardItemsByRole(roles: string[]): Observable<DashboardItem[]> {
  const rolesQuery = roles.map(role => `roles=${encodeURIComponent(role)}`).join('&');
  const url = `${this.apiUrl}/dashboard-summary${rolesQuery ? `?${rolesQuery}` : ''}`;
  
  console.log('📊 Dashboard API URL:', url); // Add this line
  
  return this.http.get<DashboardItem[]>(url, {
    headers: this.getHeaders(),
    withCredentials: true
  }).pipe(
    tap(response => console.log('📊 Dashboard API Response:', response)), // Add this line
    catchError(error => {
      console.error('📊 Dashboard API Error:', error); // Add this line
      return this.handleError(error);
    })
  );
}

  getItem(itemId: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${itemId}`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(item => ({
        ...item,
        description: item.description || 'Unknown',
        category: item.category || 'Unknown',
        unitPrice: item.unitPrice ?? 0,
        currency: item.currency ?? 'ETB',
        source: item.source || 'Unknown',
        serialNumbers: item.serialNumbers ?? [],
        accessories: item.accessories || [],
        units: item.units || [],
        transactionHistory: item.transactionHistory || []
      })),
      catchError(this.handleError)
    );
  }

  // Fixed createItem method with enhanced registeredBy logic
  createItem(request: ItemReceiveRequest): Observable<ApiResponse<{ itemId: number }>> {
    // Ensure registeredBy is set before sending with enhanced fallback logic
    if (!request.registeredBy || request.registeredBy === 'anonymous' || request.registeredBy === 'Unknown') {
      const currentUser = this.authService.getCurrentUser();
      
      let username = '';
      
      // Try to build name from first and last name first
      if (currentUser) {
        if (currentUser.firstName && currentUser.lastName) {
          username = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        } 
        // If no full name, use username
        else if (currentUser.username) {
          username = currentUser.username;
        }
      }
      
      // If still no username, try getUsername() method
      if (!username) {
        username = this.authService.getUsername() || '';
      }
      
      // Additional fallback: try getFirstName() and getLastName() separately
      if (!username) {
        const firstName = this.authService.getFirstName();
        const lastName = this.authService.getLastName();
        if (firstName && lastName) {
          username = `${firstName} ${lastName}`.trim();
        } else if (firstName) {
          username = firstName;
        } else if (lastName) {
          username = lastName;
        }
      }
      
      // Final fallback - use a generic system user
      if (!username || username === 'anonymous' || username === 'Unknown') {
        username = 'System User';
      }
      
      request.registeredBy = username;
      console.log('ItemService: Setting registeredBy to:', username, 'Original:', request.registeredBy);
    }
    
    console.log('ItemService: Final request with registeredBy:', request.registeredBy);

    return this.http.post<ApiResponse<{ itemId: number }>>(
      `${this.apiUrl}/receive`,
      request,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        console.log('ItemService: Create item response:', response);
      }),
      catchError(this.handleError)
    );
  }

  bulkReceiveItems(bulkRequest: BulkReceiveRequest): Observable<ApiResponse<{ itemIds: number[] }>> {
    // Ensure registeredBy is set for bulk requests with enhanced fallback logic
    if (!bulkRequest.registeredBy || bulkRequest.registeredBy === 'anonymous' || bulkRequest.registeredBy === 'Unknown') {
      const currentUser = this.authService.getCurrentUser();
      
      let username = '';
      
      // Try to build name from first and last name first
      if (currentUser) {
        if (currentUser.firstName && currentUser.lastName) {
          username = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        } 
        // If no full name, use username
        else if (currentUser.username) {
          username = currentUser.username;
        }
      }
      
      // If still no username, try getUsername() method
      if (!username) {
        username = this.authService.getUsername() || '';
      }
      
      // Additional fallback: try getFirstName() and getLastName() separately
      if (!username) {
        const firstName = this.authService.getFirstName();
        const lastName = this.authService.getLastName();
        if (firstName && lastName) {
          username = `${firstName} ${lastName}`.trim();
        } else if (firstName) {
          username = firstName;
        } else if (lastName) {
          username = lastName;
        }
      }
      
      // Final fallback - use a generic system user
      if (!username || username === 'anonymous' || username === 'Unknown') {
        username = 'System User';
      }
      
      bulkRequest.registeredBy = username;
      console.log('ItemService: Setting bulk registeredBy to:', username, 'Original:', bulkRequest.registeredBy);
    }
    
    console.log('ItemService: Final bulk request with registeredBy:', bulkRequest.registeredBy);

    return this.http.post<ApiResponse<{ itemIds: number[] }>>(
      `${this.apiUrl}/bulk-receive`,
      bulkRequest,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        console.log('ItemService: Bulk receive response:', response);
      }),
      catchError(this.handleError)
    );
  }

  addItemQuantity(request: AddItemQuantityRequest): Observable<ApiResponse<{ itemId: number }>> {
    // Apply the same registeredBy logic for addItemQuantity
    if (!request.registeredBy || request.registeredBy === 'anonymous' || request.registeredBy === 'Unknown') {
      const currentUser = this.authService.getCurrentUser();
      
      let username = '';
      
      if (currentUser) {
        if (currentUser.firstName && currentUser.lastName) {
          username = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        } else if (currentUser.username) {
          username = currentUser.username;
        }
      }
      
      if (!username) {
        username = this.authService.getUsername() || '';
      }
      
      if (!username) {
        const firstName = this.authService.getFirstName();
        const lastName = this.authService.getLastName();
        if (firstName && lastName) {
          username = `${firstName} ${lastName}`.trim();
        } else if (firstName) {
          username = firstName;
        } else if (lastName) {
          username = lastName;
        }
      }
      
      if (!username || username === 'anonymous' || username === 'Unknown') {
        username = 'System User';
      }
      
      request.registeredBy = username;
    }

    return this.http.post<ApiResponse<{ itemId: number }>>(
      `${this.apiUrl}/receive`,
      request,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  bulkAddItemQuantity(bulkRequest: BulkAddItemQuantityRequest): Observable<ApiResponse<{ itemIds: number[] }>> {
    // Apply the same registeredBy logic for bulkAddItemQuantity
    if (!bulkRequest.registeredBy || bulkRequest.registeredBy === 'anonymous' || bulkRequest.registeredBy === 'Unknown') {
      const currentUser = this.authService.getCurrentUser();
      
      let username = '';
      
      if (currentUser) {
        if (currentUser.firstName && currentUser.lastName) {
          username = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        } else if (currentUser.username) {
          username = currentUser.username;
        }
      }
      
      if (!username) {
        username = this.authService.getUsername() || '';
      }
      
      if (!username) {
        const firstName = this.authService.getFirstName();
        const lastName = this.authService.getLastName();
        if (firstName && lastName) {
          username = `${firstName} ${lastName}`.trim();
        } else if (firstName) {
          username = firstName;
        } else if (lastName) {
          username = lastName;
        }
      }
      
      if (!username || username === 'anonymous' || username === 'Unknown') {
        username = 'System User';
      }
      
      bulkRequest.registeredBy = username;
    }

    return this.http.post<ApiResponse<{ itemIds: number[] }>>(
      `${this.apiUrl}/bulk-receive`,
      bulkRequest,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getShelvesByWarehouse(warehouseId: string): Observable<ShelfDto[]> {
    return this.http.get<ShelfDto[]>(`${this.shelvesApiUrl}/by-warehouse/${warehouseId}`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  getWarehouses(): Observable<WarehouseDto[]> {
    return this.http.get<WarehouseDto[]>(this.warehousesApiUrl, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<Category[]>(this.categoriesApiUrl, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(categories => categories.map(cat => cat.name).sort()),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return this.http.get<string[]>('assets/categories.json').pipe(
            catchError(this.handleError)
          );
        }
        return this.handleError(error);
      })
    );
  }

  getAllCategories(): Observable<Category[]> {
    const userRole = this.authService.getRole();
    let url = this.categoriesApiUrl;
    if (userRole && userRole !== 'SUPER_ADMIN') {
      url += `?role=${encodeURIComponent(userRole)}`;
    }
    return this.http.get<Category[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  createCategory(request: { name: string; description: string; role: string }): Observable<ApiResponse<Category>> {
    const payload = {
      Name: request.name,
      Description: request.description || '',
      Role: request.role
    };
    return this.http.post<ApiResponse<Category>>(
      this.categoriesApiUrl,
      payload,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateCategory(id: number, request: { name: string; description: string }): Observable<ApiResponse<void>> {
    const payload = {
      Name: request.name,
      Description: request.description || ''
    };
    return this.http.put<ApiResponse<void>>(
      `${this.categoriesApiUrl}/${id}`,
      payload,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getWarehouseSummary(roles: string[] = []): Observable<WarehouseSummaryDto[]> {
    const rolesQuery = roles.length ? `?${roles.map(role => `roles=${encodeURIComponent(role)}`).join('&')}` : '';
    const url = `${this.apiUrl}/warehouse-summary${rolesQuery}`;
    return this.http.get<WarehouseSummaryDto[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteCategory(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.categoriesApiUrl}/${id}`,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getTransactionHistory(itemId: number): Observable<TransactionEntry[]> {
    return this.http.get<TransactionEntry[]>(`${this.apiUrl}/${itemId}/transactions`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return throwError(() => new Error('No transactions found for this item.'));
        }
        return this.handleError(error);
      })
    );
  }

  getAllTransactionHistories(): Observable<TransactionEntryDto[]> {
    return this.http.get<TransactionEntryDto[]>(`${this.apiUrl}/transactions`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  getWithdrawTransactions(): Observable<WithdrawHistoryDto[]> {
    return this.http.get<WithdrawHistoryDto[]>(`${this.apiUrl}/withdraw-history`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  getReceiveHistory(): Observable<ReceiveHistoryDto[]> {
    return this.http.get<ReceiveHistoryDto[]>(`${this.apiUrl}/receive-history`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Add this method to your ItemService
  updateItem(itemId: number, request: UpdateItemRequest): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/${itemId}`,
      request,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Add accessories to an existing item
  addAccessoriesToItem(request: any): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.apiUrl}/${request.itemId}/add-accessories`,
      request,
      {
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        console.log('ItemService: Add accessories response:', response);
      }),
      catchError(this.handleError)
    );
  }

  // Get accessories by role
  getAccessoriesByRole(roles: string[]): Observable<any[]> {
    const rolesQuery = roles.map(role => `roles=${encodeURIComponent(role)}`).join('&');
    const url = `${this.apiUrl}/accessories/by-roles?${rolesQuery}`;
    console.log(`🔍 Fetching accessories for roles: ${roles.join(', ')}`);
    console.log(`📡 Request URL: ${url}`);
    
    return this.http.get<any[]>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(accessories => console.log(`✅ Received ${accessories.length} accessories for roles: ${roles.join(', ')}`)),
      catchError(error => {
        console.error(`❌ Error fetching accessories for roles ${roles.join(', ')}:`, error);
        return this.handleError(error);
      })
    );
  }

  getFilteredReceiveHistory(
    search: string = '',
    period: string = '',
    roles: string[] = [],
    categories: string[] = [],
    page: number = 1,
    pageSize: number = 5
  ): Observable<PaginatedResponse<ReceiveHistoryDto>> {
    let url = `${this.apiUrl}/receive-history/filter`;
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (period) params.push(`period=${encodeURIComponent(period)}`);
    if (roles.length) params.push(...roles.map(role => `roles=${encodeURIComponent(role)}`));
    if (categories.length) params.push(...categories.map(cat => `categories=${encodeURIComponent(cat)}`));
    params.push(`page=${page}`, `pageSize=${pageSize}`);
    if (params.length) url += `?${params.join('&')}`;

    return this.http.get<PaginatedResponse<any>>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(response => ({
        ...response,
        data: response.data.map((record: any) => ({
          transactionId: record.transactionId || record.itemId,
          category: record.category || 'Unknown',
          description: record.description || 'Unknown',
          model: record.model || 'Unknown',
          quantity: record.quantity ?? 0,
          voucherNumber: record.voucherNumber || '',
          receivedFrom: record.receivedFrom || 'Unknown',
          registeredBy: record.registeredBy || 'Unknown',
          date: record.date || 'Unknown Date',
          source: record.source || 'Purchase',
          unitPrice: record.unitPrice ?? 0,  // FIXED: Pull directly from record
          currency: record.currency ?? 'ETB'  // FIXED: Pull directly from record
        }))
      })),
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