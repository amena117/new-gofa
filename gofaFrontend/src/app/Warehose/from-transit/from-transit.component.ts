// src/app/transit/from-transit/from-transit.component.ts
import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../transit/services/transit.service';
import { Item } from '../../transit/models/item.model';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import moment from 'moment';

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
  selectedRange = '0'; // Default to show all records
  isLoading = false;
  errorMessage = '';

  ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

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
    this.isLoading = true;
    
    if (this.selectedRange === '0') {
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
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading items:', err);
          this.isLoading = false;
        },
      });
    } else {
      this.transitService.getModel1ByDateRange(this.selectedRange).subscribe({
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
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading items:', err);
          this.isLoading = false;
        },
      });
    }
  }

  filterByRange(): void {
    this.loadItems();
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
        // Sort by model1Id as a proxy for date (newest first)
        this.filteredItems.sort((a, b) => b.model1Id - a.model1Id);
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

  printDetails(): void {
    if (this.filteredItems.length === 0) {
      this.errorMessage = 'No records to export';
      return;
    }

    try {
      // Create a temporary HTML element to render for html2canvas
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '1200px';
      tempElement.style.backgroundColor = 'white';
      tempElement.style.padding = '30px';
      tempElement.style.fontFamily = 'Arial, sans-serif';
      
      // Add header
      tempElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #03203c; margin: 0 0 10px 0;">New Items from Transit Report</h1>
          <p style="color: #4a5568; margin: 0 0 15px 0;">Report Period: ${this.selectedRange === '0' ? 'All Time' : this.getDateRangeText()}</p>
          <p style="color: #4a5568; margin: 0;">Total Records: ${this.filteredItems.length}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #03203c; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Supplier</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Type</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Serial No</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty Ordered</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty Received</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Status</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Store Type</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredItems.map(record => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="border: 1px solid #ddd; padding: 8px;">${record.date || ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.truncateText(record.supplier || 'N/A', 20)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${this.truncateText(record.itemType || 'N/A', 20)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${record.serialNumber || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.ordered || 0}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.received || 0}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.status || 'Waiting For Stores'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.storeType || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      document.body.appendChild(tempElement);
      
      html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      }).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const fileName = `NewItemsFromTransit_Report_${this.selectedRange}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        // Clean up
        document.body.removeChild(tempElement);
      }).catch((error: any) => {
        console.error('html2canvas failed:', error);
        this.errorMessage = 'Failed to generate PDF';
        document.body.removeChild(tempElement);
      });
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      this.errorMessage = 'Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
  }

  printSingleRecord(record: Item): void {
    try {
      // Create a temporary HTML element to render for html2canvas
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '800px';
      tempElement.style.backgroundColor = 'white';
      tempElement.style.padding = '30px';
      tempElement.style.fontFamily = 'Arial, sans-serif';
      
      // Add header and details
      tempElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #03203c; margin: 0 0 10px 0;">Transit Record Details</h1>
          <p style="color: #4a5568; margin: 0;">Record ID: ${record.model1Id}</p>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div><strong>Date:</strong> ${record.date || 'N/A'}</div>
          <div><strong>Supplier:</strong> ${record.supplier || 'N/A'}</div>
          <div><strong>Serial Number:</strong> ${record.serialNumber || 'N/A'}</div>
          <div><strong>Item Type:</strong> ${record.itemType || 'N/A'}</div>
          <div><strong>Category:</strong> ${record.category || 'N/A'}</div>
          <div><strong>Quantity Ordered:</strong> ${record.ordered || 0}</div>
          <div><strong>Quantity Received:</strong> ${record.received || 0}</div>
          <div><strong>Status:</strong> ${record.status || 'Waiting For Stores'}</div>
          <div><strong>Store Type:</strong> ${record.storeType || 'N/A'}</div>
          <div><strong>Store:</strong> ${record.Store || 'N/A'}</div>
          <div><strong>Location:</strong> ${record.location || 'N/A'}</div>
          <div><strong>Invoice No:</strong> ${record.invoiceNo || 'N/A'}</div>
          <div><strong>PR No:</strong> ${record.prno || 'N/A'}</div>
          <div><strong>Checked By:</strong> ${record.checkedByName || 'N/A'}</div>
          <div><strong>Received By:</strong> ${record.recivedByName || 'N/A'}</div>
          <div><strong>Authorized By:</strong> ${record.authorizedByName || 'N/A'}</div>
          <div><strong>Prepared By:</strong> ${record.preparedBy || 'N/A'}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <strong>Remark:</strong> ${record.remark || 'N/A'}
        </div>
      `;
      
      // Add accessories
      if (record.accessories && record.accessories.length > 0) {
        let accessoriesHtml = `
        <div style="margin-top: 20px;">
          <h3 style="color: #03203c;">Accessories:</h3>
          <ul>
            ${record.accessories.map(acc => `<li>${acc.name} - Qty: ${acc.quantity}</li>`).join('')}
          </ul>
        </div>
      `;
        tempElement.innerHTML += accessoriesHtml;
      }
      
      // Add extra items
      if (record.extraItems && record.extraItems.length > 0) {
        let extraItemsHtml = `
        <div style="margin-top: 20px;">
          <h3 style="color: #03203c;">Extra Items:</h3>
          <ul>
            ${record.extraItems.map(extra => `<li>${extra.name} - Qty: ${extra.quantity} - Store: ${extra.store} - Status: ${extra.extraStatus || 'Waiting For Stores'}</li>`).join('')}
          </ul>
        </div>
      `;
        tempElement.innerHTML += extraItemsHtml;
      }
      
      document.body.appendChild(tempElement);
      
      html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      }).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const fileName = `Record_${record.model1Id}_${record.serialNumber || 'NO_SERIAL'}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        // Clean up
        document.body.removeChild(tempElement);
      }).catch((error: any) => {
        console.error('html2canvas failed:', error);
        document.body.removeChild(tempElement);
      });
      
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  }

  private getDateRangeText(): string {
    switch (this.selectedRange) {
      case '1week': return 'Last Week';
      case '1month': return 'Last Month';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case '9months': return 'Last 9 Months';
      case '1year': return 'Last Year';
      default: return 'All Time';
    }
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }
}