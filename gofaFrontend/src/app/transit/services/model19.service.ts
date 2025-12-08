import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Model19 } from '../models/model19.model';


@Injectable({
  providedIn: 'root'
})
export class Model19Service {
  private mockModel19Items: Model19[] = [
    // Add mock data here
  ];

  getModel19Items(): Observable<Model19[]> {
    return of(this.mockModel19Items);
  }

  // deleteModel19Item(id:
  getItemById(id: number): Observable<Model19> {
       const item = this.mockModel19Items.find(item => item.Model19Id === id);
       if (item) {
         return of(item); // Return an observable of the found item
       } else {
         throw new Error(`Item with id ${id} not found`);
       }
     }

    updateItem(id: number, updatedItem: Model19): Observable<Model19> {
      // Replace with actual API call
      const index = this.mockModel19Items.findIndex(item => item.Model19Id === id);
      if (index > -1) {
        this.mockModel19Items[index] = { ...this.mockModel19Items[index], ...updatedItem };
      }
      return of(this.mockModel19Items[index]);
    }



    

    deleteModel19Item(itemId: number): Observable<void> {
      // Delete from mock data
      this.mockModel19Items = this.mockModel19Items.filter(item => item.Model19Id !== itemId);
      return of(undefined);
    }

    // getSentToStore(): Observable<Item[]> {
    //   return of(MOCK_SENT_TO_STORE_ITEMS);
    // }

    // // Get items sent for inspection
    // getSentForInspection(): Observable<Item[]> {
    //   return of(MOCK_SENT_FOR_INSPECTION_ITEMS);
    // }

    // // Get notifications (items from inspection unit)
    // getNotifications(): Observable<Item[]> {
    //   return of(MOCK_NOTIFICATIONS);
    // }

    // sendToStore(item: Item) {
    //       // return this.http.post<Item>(`${this.apiUrl}/send-to-store`, item);
    //     }

    // receiveFromInspection(itemId: number) {
    //   return of(MOCK_RECEIVED_ITEMS);
    //     }

    // getInspectedItems(){
    //   return of(MOCK_INSPECTED_ITEMS);
    // }
    // sendToInspection(item: Item){
    //   return of(MOCK_RECEIVED_ITEMS);
    // }
    // getReceivedItems(){
    //   return of(MOCK_RECEIVED_ITEMS);
    // }
    // addSentToStoreItem(item: Item): Observable<Item> {
    //   MOCK_SENT_TO_STORE_ITEMS.push(item);
    //   return of(item);
    // }

    // addSentForInspectionItem(item: Item): Observable<Item> {
    //   MOCK_SENT_FOR_INSPECTION_ITEMS.push(item);
    //   return of(item);
    // }
  }
