// model2-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Model2Service } from '../../services/model2.service';
import { Model2Item } from '../../models/model2.model';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-model2-list',
  templateUrl: './model2-list.component.html',
  styleUrls: ['./model2-list.component.css']
})
export class Model2ListComponent implements OnInit {
  records: Model2Item[] = [];
  filteredRecords: Model2Item[] = [];
  paginatedRecords: Model2Item[] = [];
  searchQuery: string = '';
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 0;
  selectedSort = 'date';

  sortOptions = [
    { value: 'date', viewValue: 'Date' },
    { value: 'status', viewValue: 'Status' },
    { value: 'voucherNumber', viewValue: 'Voucher Number' },
    { value: 'requestingUnit', viewValue: 'Requesting Unit' }
  ];

  constructor(
    private model2Service: Model2Service,
    public dialog: MatDialog
  ) { }

  ngOnInit() {
    this.loadRecords();
  }

  // Helper methods for stats
  getApprovedCount(): number {
    return this.filteredRecords.filter(record => 
      record.status === 'Approved'
    ).length;
  }

  getPendingCount(): number {
    return this.filteredRecords.filter(record => 
      !record.status || record.status === 'Pending' || record.status !== 'Approved'
    ).length;
  }

  // Status display methods
  getStatusClass(status: string | undefined): string {
    if (!status || status === 'Pending') return 'pending';
    if (status === 'Approved') return 'approved';
    return 'pending';
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }

  loadRecords() {
    this.model2Service.getModel2Records().subscribe({
      next: (data: any[]) => {
        this.records = data.map((d: any) => ({
          ...d,
          model2Id: d.id || d.Id || d.model2Id,
          date: d.date || d.Date,
          voucherNumber: d.voucherNumber || d.VoucherNumber,
          stockNumber: d.stockNumber || d.StockNumber,
          description: d.description || d.Description,
          requestingUnit: d.requestingUnit || d.RequestingUnit,
          issuingStore: d.issuingStore || d.IssuingStore,
          issued: d.issued || d.Issued,
          totalPrice: d.totalPrice || d.TotalPrice,
          status: d.status || d.Status,
          accessories: d.accessories || d.Accessories,
          extraItems: d.extraItems || d.ExtraItems
        }));
        this.filteredRecords = [...this.records];
        this.sortRecords(this.selectedSort);
        this.updatePagination();
      },
      error: (err) => console.error('Error loading records:', err)
    });
  }

  approveRecord(record: Model2Item) {
    const updatedRecord = { ...record, status: 'Approved' };
    this.model2Service.updateModel2Status(record.model2Id, updatedRecord).subscribe({
      next: () => this.loadRecords(),
      error: (err) => console.error('Approval failed:', err)
    });
  }

  deleteRecord(record: Model2Item) {
    const confirmed = window.confirm(`Are you sure you want to delete voucher ${record.voucherNumber}?`);
    if (confirmed) {
      this.model2Service.deleteModel2Record(record.model2Id).subscribe({
        next: () => this.loadRecords(),
        error: (err) => console.error('Delete failed:', err)
      });
    }
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredRecords = [...this.records];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredRecords = this.records.filter(record =>
        record.voucherNumber?.toLowerCase().includes(query) ||
        record.requestingUnit?.toLowerCase().includes(query) ||
        record.stockNumber?.toLowerCase().includes(query) ||
        (record.status ?? '').toLowerCase().includes(query)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  onSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedSort = selectElement.value;
    this.sortRecords(this.selectedSort);
    this.updatePagination();
  }

  sortRecords(sortBy: string) {
    switch (sortBy) {
      case 'date':
        this.filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'status':
        this.filteredRecords.sort((a, b) => (b.status || '').localeCompare(a.status || ''));
        break;
      case 'voucherNumber':
        this.filteredRecords.sort((a, b) => (a.voucherNumber || '').localeCompare(b.voucherNumber || ''));
        break;
      case 'requestingUnit':
        this.filteredRecords.sort((a, b) => (a.requestingUnit || '').localeCompare(b.requestingUnit || ''));
        break;
    }
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredRecords.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(startIndex, endIndex);
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  // Helper method to calculate the end index for displaying records
  getDisplayEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredRecords.length);
  }

  // Helper method to calculate the start index for displaying records
  getDisplayStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  // TrackBy function for performance optimization
  trackByRecordId(index: number, record: Model2Item): any {
    return record.model2Id || index;
  }
}