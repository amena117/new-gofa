// src/app/transit/from-transit/from-transit.component.ts
import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../transit/services/transit.service';
import { Item } from '../../transit/models/item.model';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-from-transit',
  templateUrl: './from-transit.component.html',
  styleUrls: ['./from-transit.component.css'],
})
export class FromTransitComponent implements OnInit {
  receivedItems: Item[] = [];
  filteredItems: Item[] = [];
  searchQuery: string = '';
  paginatedItems: Item[] = [];
  currentPage = 1;
  itemsPerPage = 100;
  totalPages = 0;
  selectedSort = 'status';

  itemDetails: {
    registeredBy: string;
    role: string;
  } = {
    registeredBy: '',
    role: '',
  };

  sortOptions = [
    { value: 'supplier', viewValue: 'Supplier' },
    { value: 'itemType', viewValue: 'Item Type' },
    { value: 'status', viewValue: 'Status' },
    { value: 'date', viewValue: 'Date Added' },
  ];

  constructor(
    private transitService: TransitService,
    private authService: AuthService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadItems();
    const firstName = this.authService.getFirstName() || '';
    const lastName = this.authService.getLastName() || '';
    this.itemDetails.registeredBy = `${firstName} ${lastName}`.trim();
    this.itemDetails.role = this.authService.getRole() || '';
  }

  loadItems() {
    this.transitService.getReceivedItems().subscribe({
      next: (items) => {
        const userRole = this.itemDetails.role?.toLowerCase() || '';
        this.receivedItems = items.filter(
          (item) =>
            (item.storeType || '').toLowerCase() === userRole ||
            (item.extraItems ?? []).some(
              (extra) => (extra.store || '').toLowerCase() === userRole
            )
        );
        this.filteredItems = [...this.receivedItems];
        this.sortItems(this.selectedSort);
        this.updatePagination();
      },
      error: (err) => console.error('Error loading items:', err),
    });
  }

  approveItem(item: Item): void {
    const confirmResult = window.confirm('Are you sure you want to receive this item?');
    if (!confirmResult) return;

    const updatedItem: Item = {
      ...item,
      status: 'Stores Recieved',
      recivedByName: this.itemDetails.registeredBy,
    };

    this.transitService.updateItemStatus(item.model1Id.toString(), updatedItem).subscribe({
      next: () => {
        console.log('Item received successfully:', updatedItem);
        this.loadItems();
      },
      error: (err) => console.error('Approval failed:', err),
    });
  }

  approveExtraItem(item: Item, extra: any): void {
    const confirmResult = window.confirm(`Are you sure you want to receive ${extra.name}?`);
    if (!confirmResult) return;

    const updatedExtras = (item.extraItems ?? []).map((e: any) =>
      e.id === extra.id
        ? {
            ...e,
            extraStatus: 'Stores Recieved',
            extraRecivedByName: this.itemDetails.registeredBy,
            model1Id: item.model1Id,
          }
        : { ...e, model1Id: item.model1Id }
    );

    const updatedItem: Item = {
      ...item,
      extraItems: updatedExtras,
    };

    this.transitService.updateItemStatus(item.model1Id.toString(), updatedItem).subscribe({
      next: () => {
        console.log(`Extra item ${extra.name} received successfully!`);
        this.loadItems();
      },
      error: (err) => console.error('Approval failed:', err),
    });
  }

  deleteItem(item: Item): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${item.itemType} (${item.serialNumber})?`
    );
    if (confirmed) {
      this.transitService.deleteItem(item.model1Id.toString()).subscribe({
        next: () => this.loadItems(),
        error: (err) => console.error('Delete failed:', err),
      });
    }
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredItems = [...this.receivedItems];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredItems = this.receivedItems.filter(
        (item) =>
          item.supplier.toLowerCase().includes(query) ||
          item.itemType.toLowerCase().includes(query) ||
          item.serialNumber.toLowerCase().includes(query) ||
          (item.status ?? '').toLowerCase().includes(query)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  onSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedSort = selectElement.value;
    this.sortItems(this.selectedSort);
    this.updatePagination();
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
        this.filteredItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
    }
    this.updatePagination();
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
    this.currentPage = 1;
    this.updatePagination();
  }

  getExtraItemsForCurrentStore(item: Item): any[] {
    const userRole = this.itemDetails.role?.toLowerCase();
    return (item.extraItems ?? []).filter(extra => 
      (extra.store || '').toLowerCase() === userRole
    );
  }
}