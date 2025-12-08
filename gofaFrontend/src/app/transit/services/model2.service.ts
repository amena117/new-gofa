import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Model2Item } from '../models/model2.model';
import {
  MOCK_SENT_TO_STORE_ITEMS,
  MOCK_SENT_FOR_INSPECTION_ITEMS,
  MOCK_NOTIFICATIONS,
  MOCK_INSPECTED_ITEMS,
  MOCK_RECEIVED_ITEMS,
} from '../mock-data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Model2Service {
  constructor(private http: HttpClient) {}

  private mockItems: Model2Item[] = [];
  private apiUrl = `${environment.apiBaseUrl}/api/Model2`;

  getModel2ItemById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  addModel2(payload: any[]): Observable<void> {
    return this.http.post<void>(this.apiUrl, payload);
  }

  updateModel2Item(id: string, updatedItem: any): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, updatedItem).pipe(
      catchError((error) => {
        console.error('Error updating item:', error);
        return throwError(() => new Error('Failed to update item'));
      })
    );
  }

  updateProfile(id: number, profileData: any): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put(url, profileData).pipe(
      catchError((error) => {
        console.error('Error updating profile:', error);
        return throwError(() => new Error('Failed to update profile'));
      })
    );
  }

  updateModel2Status(itemId: number, newStatus: Model2Item): Observable<Model2Item> {
    const url = `${this.apiUrl}/${itemId}`;

    return this.http.put<Model2Item>(url, newStatus, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  deleteModel2Record(itemId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${itemId}`);
  }

  sendToStore(item: Model2Item) {
    // return this.http.post<Item>(`${this.apiUrl}/send-to-store`, item);
  }

  receiveFromInspection(itemId: number) {
    return of(MOCK_RECEIVED_ITEMS);
  }

  getInspectedItems(){
    return of(MOCK_INSPECTED_ITEMS);
  }
  
  sendToInspection(item: Model2Item): Observable<Model2Item> {
    return this.http.post<Model2Item>(`${this.apiUrl}`, item);
  }
  
  getModel2Records(): Observable<Model2Item[]> {
    return this.http.get<Model2Item[]>(`${this.apiUrl}`);
  }
}