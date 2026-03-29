import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';
import { AuthService } from '../../../services/auth.service'; // Adjust path as needed

// import { MatDialog } from '@angular/material/dialog';
import { Sort } from '@angular/material/sort';

import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { EditItemComponent } from '../edit-item/edit-item.component';
import { ViewDetailsComponent } from '../view-details/view-details.component';
import { MatDialog } from '@angular/material/dialog';



@Component({
  selector: 'app-received-items-list',
  templateUrl: './received-items-list.component.html',
  styleUrl: './received-items-list.component.css'
})
export class ReceivedItemsListComponent implements OnInit {

  receivedItems: Item[] = [];
  filteredItems: Item[] = [];
  searchQuery: string = '';
  paginatedItems: Item[] = []; // Items for the current page
  currentPage = 1; // Current page number
  itemsPerPage = 100; // Number of items per page
  totalPages = 0; // Total number of pages

  sortOptions = [
    { value: 'supplier', viewValue: 'Supplier' },
    { value: 'itemType', viewValue: 'Item Type' },
    { value: 'status', viewValue: 'Status' },
    { value: 'date', viewValue: 'Date Added' }
  ];
  selectedSort = 'status';

  constructor(
    private transitService: TransitService,
    public dialog: MatDialog,
    private authService: AuthService
  ) {}



  // Math reference for template
  Math = Math;

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.transitService.getReceivedItems().subscribe({
      next: (items) => {
        this.receivedItems = items;
        this.filteredItems = [...items]; // Initialize filteredItems with the full list
        this.sortItems(this.selectedSort); // Sort initially
        this.updatePagination();
      },
      error: (err) => console.error('Error loading items:', err)
    });
  }

  // Helper methods for stats
  getReceivedCount(): number {
    return this.filteredItems.filter(item => 
      item.status === 'Stores Recieved' || item.status?.toLowerCase().includes('received')
    ).length;
  }

  getPendingCount(): number {
    return this.filteredItems.filter(item => 
      item.status === 'Waiting For Stores' || !item.status || item.status?.toLowerCase().includes('waiting')
    ).length;
  }

  // Status display methods
  getDisplayStatus(status: string | undefined): string {
    if (!status) return 'Waiting For Stores';
    const statusLower = status.toLowerCase();
    
    // Normalize all variations of "received" to "Received by Store"
    if (statusLower.includes('received') || statusLower.includes('recieved')) {
      return 'Received by Store';
    }
    
    // Normalize all variations of "waiting" to "Waiting for Store"
    if (statusLower.includes('waiting for store') || statusLower.includes('waiting for stores')) {
      return 'Waiting for Store';
    }
    
    return status;
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'waiting';
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('received') || statusLower.includes('recieved')) return 'stores-received';
    if (statusLower.includes('waiting')) return 'waiting';
    
    return 'waiting';
  }

  getExtraStatusClass(status: string | undefined): string {
    return this.getStatusClass(status);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }



  // approveItem(item: Item) {
  //   if (item.status === 'Pending Inspection') {
  //     this.transitService.updateItemStatus(item.model1Id, 'Approved').subscribe({
  //       next: () => this.loadItems(),
  //       error: (err) => console.error('Approval failed:', err)
  //     });
  //   }
  // }

  approveItem(item: Item): void {
    const newStatus = {
      ...item,
      status: 'Approved' // Only update the status field
    };

    this.transitService.updateItemStatus(item.model1Id.toString(), newStatus).subscribe({
      next: () => {
        
        this.loadItems();
      },
      error: (err) => console.error('Approval failed:', err)
    });
  }

  canDeleteItem(item: any): boolean {
    if (this.authService.hasRole('PROPERTY_CONTROL')) {
    return false;
  }
    const extraItems = item.extraItems ?? [];
    return item.status !== 'Stores Recieved' && !extraItems.some((extra: any) => extra?.extraStatus === 'Stores Recieved');
  }


  canEditItem(item: any): boolean {
  // If user is PROPERTY_CONTROL, never allow edit
  if (this.authService.hasRole('PROPERTY_CONTROL')) {
    return false;
  }

  // If main status is NOT "Stores Recieved", always allow edit
  if (item.status !== 'Stores Recieved') {
    return true;
  }

  const extraItems = item.extraItems ?? [];

  // If there are no extra items -> hide edit button
  if (extraItems.length === 0) {
    return false;
  }

  // If all extraItems are "Stores Recieved" -> hide edit button
  const allReceived = extraItems.every(
    (extra: any) => extra.extraStatus === 'Stores Recieved'
  );

  return !allReceived; // show only if at least one is NOT "Stores Recieved"
}







  // viewDetails(item: Item): void {
  //   this.dialog.open(ViewDetailsComponent, {
  //     width: '600px',
  //     data: { item }
  //   });
  // }

  // editItem(item: Item): void {
  //   const dialogRef = this.dialog.open(EditItemComponent, {
  //     width: '600px',
  //     data: { item: {...item} }
  //   });

  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       this.transitService.updateItemStatus(item.model1Id, result).subscribe({
  //         next: () => this.loadItems(),
  //         error: (err) => console.error('Update failed:', err)
  //       });
  //     }
  //   });
  // }

  deleteItem(item: Item): void {
    const confirmed = window.confirm(`Are you sure you want to delete ${item.itemType} (${item.serialNumber})?`);

    if (confirmed) {
      this.transitService.deleteItem(item.model1Id.toString()).subscribe({
        next: () => this.loadItems(),
        error: (err) => console.error('Delete failed:', err)
      });
    }
    // const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    //   data: {
    //     title: 'Confirm Delete',
    //     message: `Are you sure you want to delete ${item.itemType} (${item.serialNumber})?`
    //   }
    // });

    // dialogRef.afterClosed().subscribe(confirmed => {
    //   if (confirmed) {
    //     this.transitService.deleteItem(item.model1Id).subscribe({
    //       next: () => this.loadItems(),
    //       error: (err) => console.error('Delete failed:', err)
    //     });
    //   }
    // });
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredItems = [...this.receivedItems]; // Reset to full list if search is empty
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredItems = this.receivedItems.filter(item =>
        item.supplier.toLowerCase().includes(query) ||
        item.itemType.toLowerCase().includes(query) ||
        item.serialNumber.toLowerCase().includes(query) ||
        (item.status ?? '').toLowerCase().includes(query)
      );
    }
    this.currentPage = 1; // Reset to the first page after search
    this.updatePagination(); // Update pagination
  }

  onSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedSort = selectElement.value;
    this.sortItems(this.selectedSort);
    this.updatePagination(); // Update pagination after sorting
  }


  sortItems(sortBy: string) {
    switch (sortBy) {
      case 'supplier':
        this.filteredItems.sort((a, b) => a.supplier.localeCompare(b.supplier));
        break;
      case 'itemType':
        this.filteredItems.sort((a, b) => a.itemType.localeCompare(b.itemType));
        break;
      case 'status':
        this.filteredItems.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
        break;
      case 'date':
        this.filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      default:
        break;
    }
    this.updatePagination(); // Update pagination after sorting
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedItems = this.filteredItems.slice(startIndex, endIndex);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  onItemsPerPageChange() {
    this.currentPage = 1; // Reset to the first page
    this.updatePagination(); // Update pagination
  }

  // TrackBy function for performance optimization
  trackByItemId(index: number, item: Item): any {
    return item.model1Id || index;
  }
}
