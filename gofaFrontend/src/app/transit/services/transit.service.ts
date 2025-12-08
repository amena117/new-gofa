// src/app/transit/services/transit.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, tap } from 'rxjs/operators';
import { Item } from '../models/item.model';
import { MOCK_INSPECTED_ITEMS, MOCK_NOTIFICATIONS, MOCK_RECEIVED_ITEMS, MOCK_SENT_FOR_INSPECTION_ITEMS, MOCK_SENT_TO_STORE_ITEMS } from '../mock-data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TransitService {
  private apiUrl = `${environment.apiBaseUrl}/api/Model1`;

  constructor(private http: HttpClient) {}

  getReceivedItems(): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching received items:', error);
        return throwError(() => new Error('Failed to fetch received items'));
      })
    );
  }
  getAllModel1Records(): Observable<Item[]> {
  return this.http.get<Item[]>(this.apiUrl);
}

getModel1ByDateRange(period: string) {
    return this.http.get<Item[]>(`${this.apiUrl}/filter-by-date?period=${period}`);
  }

  getItemById(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching item with id ${id}:`, error);
        return throwError(() => new Error(`Failed to fetch item with id ${id}`));
      })
    );
  }

  updateItemStatus(itemId: string, updatedItem: Item): Observable<Item> {
    const url = `${this.apiUrl}/${itemId}`;
    return this.http.put<Item>(url, updatedItem, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    }).pipe(
      tap((response: Item) => {
        console.log('Item updated successfully:', response);
      }),
      catchError((error) => {
        console.error('Error updating item:', error);
        return throwError(() => new Error('Failed to update item status'));
      })
    );
  }

  updateItem(id: string, updatedItem: any): Observable<any> {
    // Replace with actual API call
    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, updatedItem).pipe(
      catchError((error) => {
        console.error('Error updating item:', error);
        return throwError(() => new Error('Failed to update item'));
      })
    );

  }

  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${itemId}`).pipe(
      catchError((error) => {
        console.error(`Error deleting item with id ${itemId}:`, error);
        return throwError(() => new Error(`Failed to delete item with id ${itemId}`));
      })
    );
  }

  // Other methods remain unchanged
  getSentToStore(): Observable<Item[]> {
    return of(MOCK_SENT_TO_STORE_ITEMS);
  }

  getSentForInspection(): Observable<Item[]> {
    return of(MOCK_SENT_FOR_INSPECTION_ITEMS);
  }

  getNotifications(): Observable<Item[]> {
    return of(MOCK_NOTIFICATIONS);
  }

  sendToStore(item: Item): Observable<Item> {
    return this.http.post<Item>(`${this.apiUrl}/send-to-store`, item);
  }

  receiveFromInspection(itemId: number): Observable<Item[]> {
    return of(MOCK_RECEIVED_ITEMS);
  }

  getInspectedItems(): Observable<Item[]> {
    return of(MOCK_INSPECTED_ITEMS);
  }

  sendToInspection(payload: any): Observable<any> {
  return this.http.post(`${this.apiUrl}`, payload, { withCredentials: true });
}

  addSentToStoreItem(item: Item): Observable<Item> {
    MOCK_SENT_TO_STORE_ITEMS.push(item);
    return of(item);
  }

  addSentForInspectionItem(item: Item): Observable<Item> {
    MOCK_SENT_FOR_INSPECTION_ITEMS.push(item);
    return of(item);
  }
}