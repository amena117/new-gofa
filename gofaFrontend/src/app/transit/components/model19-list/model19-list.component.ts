
import { Component, OnInit } from '@angular/core';
import { Model19Service } from '../../services/model19.service';

import { Model19 } from '../../models/model19.model';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { EditModel19Component } from '../edit-model19/edit-model19.component';
import { ViewModel19Component } from '../view-model19/view-model19.component';

@Component({
  selector: 'app-model19-list',
  templateUrl: './model19-list.component.html',
  styleUrls: ['./model19-list.component.css']
})
export class Model19ListComponent implements OnInit {
  model19Items: Model19[] = [];
  filteredItems: Model19[] = [];
  searchQuery: string = '';
  paginatedItems: Model19[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  sortOptions = [
    { value: 'department', viewValue: 'Department' },
    { value: 'itemNo', viewValue: 'ItemNo' },
    { value: 'date', viewValue: 'Date' },
    { value: 'name', viewValue: 'Name' }
  ];
  selectedSort = 'department';

  constructor(
    private model19Service: Model19Service,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.model19Service.getModel19Items().subscribe({
      next: (items) => {
        this.model19Items = items;
        this.filteredItems = [...items];
        this.sortItems(this.selectedSort);
        this.updatePagination();
      },
      error: (err) => console.error('Error loading items:', err)
    });
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredItems = [...this.model19Items];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredItems = this.model19Items.filter(item =>
        item.Department.toLowerCase().includes(query) ||
        item.ItemNo.toString().toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.SerialNumber.toLowerCase().includes(query)
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
      case 'department':
        this.filteredItems.sort((a, b) => a.Department.localeCompare(b.Department));
        break;
      case 'itemNo':
        this.filteredItems.sort((a, b) => a.ItemNo - b.ItemNo);
        break;
      case 'date':
        this.filteredItems.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        break;
      case 'name':
        this.filteredItems.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
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

  deleteItem(item: Model19): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete ${item.name} (${item.SerialNumber})?`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.model19Service.deleteModel19Item(item.Model19Id).subscribe({
          next: () => this.loadItems(),
          error: (err) => console.error('Delete failed:', err)
        });
      }
    });
  }
}
