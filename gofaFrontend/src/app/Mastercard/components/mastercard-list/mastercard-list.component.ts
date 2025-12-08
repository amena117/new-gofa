import { Component, OnInit } from '@angular/core';
import { MasterCardService } from '../../../services/mastercard.service';
import { MasterCardItem } from '../../models/mastercard.model';

@Component({
  selector: 'app-mastercard-list',
  templateUrl: './mastercard-list.component.html',
  styleUrl: './mastercard-list.component.css'
})

export class MastercardListComponent implements OnInit {

  masterCards: MasterCardItem[] = [];
  filteredCards: MasterCardItem[] = [];
  searchQuery: string = '';
  paginatedCards: MasterCardItem[] = [];
  // paginatedItems: Item[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  sortOptions = [
    { value: 'Model', viewValue: 'Model' },
    { value: 'PartNumber', viewValue: 'Part Number' },
    { value: 'Status', viewValue: 'Status' },
    { value: 'Date', viewValue: 'Date' }
  ];
  selectedSort = 'Model';

  constructor(private masterCardService: MasterCardService) {}

  ngOnInit() {
    this.loadCards();
  }

  loadCards() {
    this.masterCardService.getMasterCards().subscribe({
      next: (cards) => {
        this.masterCards = cards;
        this.filteredCards = [...cards];
        // this.sortCards(this.selectedSort);
        this.updatePagination();
      },
      error: (err) => console.error('Error loading cards:', err)
    });
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredCards = [...this.masterCards];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredCards = this.masterCards.filter(card =>
        Object.values(card).some(value =>
          value?.toString().toLowerCase().includes(query)
        )
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  // onSortChange(event: Event) {
  //   const selectElement = event.target as HTMLSelectElement;
  //   this.selectedSort = selectElement.value;
  //   this.sortCards(this.selectedSort);
  //   this.updatePagination();
  // }

  // sortCards(sortBy: string) {
  //   this.filteredCards.sort((a, b) => {
  //     const valueA = a[sortBy]?.toString().toLowerCase() || '';
  //     const valueB = b[sortBy]?.toString().toLowerCase() || '';
  //     return valueA.localeCompare(valueB);
  //  });
  // }

  // sortItems(sortBy: string) {
  //   switch (sortBy) {
  //     case 'supplier':
  //       this.filteredCards.sort((a, b) => a.model.localeCompare(b.model));
  //       break;
  //     case 'itemType':
  //       this.filteredCards.sort((a, b) => a.description.localeCompare(b.description));
  //       break;
  //     case 'status':
  //       this.filteredCards.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
  //       break;
  //     case 'date':
  //       this.filteredCards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  //       break;
  //     default:
  //       break;
  //   }
  //   this.updatePagination(); // Update pagination after sorting
  // }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredCards.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedCards = this.filteredCards.slice(startIndex, endIndex);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  approveItem(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  deleteItem(item: MasterCardItem): void {
      // const confirmed = window.confirm(`Are you sure you want to delete ${item.itemType} (${item.serialNumber})?`);

      // if (confirmed) {
      //   this.transitService.deleteItem(item.model1Id.toString()).subscribe({
      //     next: () => this.loadItems(),
      //     error: (err) => console.error('Delete failed:', err)
      //   });
      // }
  }
}

  // deleteItem(item: Item): void {
  //   const confirmed = window.confirm(`Are you sure you want to delete ${item.itemType} (${item.serialNumber})?`);

  //   if (confirmed) {
  //     this.transitService.deleteItem(item.model1Id.toString()).subscribe({
  //       next: () => this.loadItems(),
  //       error: (err) => console.error('Delete failed:', err)
  //     });
  //   }

  // }

  // onSearch() {
  //   if (!this.searchQuery) {
  //     this.filteredItems = [...this.receivedItems]; // Reset to full list if search is empty
  //   } else {
  //     const query = this.searchQuery.toLowerCase();
  //     this.filteredItems = this.receivedItems.filter(item =>
  //       item.supplier.toLowerCase().includes(query) ||
  //       item.itemType.toLowerCase().includes(query) ||
  //       item.serialNumber.toLowerCase().includes(query) ||
  //       (item.status ?? '').toLowerCase().includes(query)
  //     );
  //   }
  //   this.currentPage = 1; // Reset to the first page after search
  //   this.updatePagination(); // Update pagination
  // }

  // onSortChange(event: Event) {
  //   const selectElement = event.target as HTMLSelectElement;
  //   this.selectedSort = selectElement.value;
  //   this.sortItems(this.selectedSort);
  //   this.updatePagination(); // Update pagination after sorting
  // }


  // sortItems(sortBy: string) {
  //   switch (sortBy) {
  //     case 'supplier':
  //       this.filteredItems.sort((a, b) => a.supplier.localeCompare(b.supplier));
  //       break;
  //     case 'itemType':
  //       this.filteredItems.sort((a, b) => a.itemType.localeCompare(b.itemType));
  //       break;
  //     case 'status':
  //       this.filteredItems.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
  //       break;
  //     case 'date':
  //       this.filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  //       break;
  //     default:
  //       break;
  //   }
  //   this.updatePagination(); // Update pagination after sorting
  // }

  // updatePagination() {
  //   this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
  //   const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  //   const endIndex = startIndex + this.itemsPerPage;
  //   this.paginatedItems = this.filteredItems.slice(startIndex, endIndex);
  // }

  // onPageChange(page: number) {
  //   this.currentPage = page;
  //   this.updatePagination();
  // }

  // getPageNumbers(): number[] {
  //   const pages = [];
  //   for (let i = 1; i <= this.totalPages; i++) {
  //     pages.push(i);
  //   }
  //   return pages;
  // }

  // onItemsPerPageChange() {
  //   this.currentPage = 1; // Reset to the first page
  //   this.updatePagination(); // Update pagination
  // }
