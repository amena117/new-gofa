import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RequestService } from '../../../services/request.service';
import { RequestOrderReportFilter, RequestOrderReportResponse } from '../../models/mastercard.model';

// Use type alias to define OrderWithDetails
type OrderWithDetails = RequestOrderReportResponse['orders'][number] & {
  showDetails: boolean;
};

@Component({
  selector: 'app-request-orders-report',
  templateUrl: './request-orders-report.component.html',
  styleUrls: ['./request-orders-report.component.css'],
})
export class RequestOrdersReportComponent implements OnInit {
  formGroup: FormGroup;
  reportData: RequestOrderReportResponse | null = null;
  categories: string[] = [];
  makeAndModels: string[] = [];

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService
  ) {
    this.formGroup = this.fb.group({
      startDate: [''],
      endDate: [''],
      requestingUnit: [''],
      issuingStore: [''],
      category: [''],
      makeAndModel: [''],
      stockNumber: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.loadDropdownOptions();
    this.loadReport();
  }

  loadDropdownOptions(): void {
    this.requestService.getCategories().subscribe({
      next: (categories: string[]) => (this.categories = categories.filter(c => c)),
      error: (err: any) => console.error('Error loading categories:', err),
    });
    this.requestService.getMakeAndModels().subscribe({
      next: (makeAndModels: string[]) => (this.makeAndModels = makeAndModels.filter(m => m)),
      error: (err: any) => console.error('Error loading make and models:', err),
    });
  }
reporttData: {
  orders: any[];
  summary: any;
} | null = null;


exportToCSV(): void {
  const orders = this.reporttData?.orders || [];
  if (orders.length === 0) return;

  // CSV headers (summary row per order)
  const headers = [
    'ID',
    'Date',
    'Issue Voucher No',
    'Voucher No',
    'Requesting Unit',
    'Issuing Store',
    'Category',
    'Make and Model',
    'Total Items',
    'Total Quantity',
    'Total Price',
    'Currency'
  ];

  // Add detail headers (for issued items) — we'll flatten them
  const detailHeaders = [
    'Item No',
    'Stock Number',
    'Description',
    'Issued Quantity',
    'Unit Price',
    'Item Total Price'
  ];

  let csvContent = '';

  // Option 1: Export only summary rows (simple)
  const summaryRows = orders.map(order => [
    order.order.id,
    new Date(order.order.date).toISOString().split('T')[0],
    `"${order.order.issueVoucherNo}"`,
    `"${order.order.voucherNo}"`,
    `"${order.order.requestingUnit}"`,
    `"${order.order.issuingStore}"`,
    `"${order.order.category}"`,
    `"${order.order.makeAndModel}"`,
    order.totals.totalItems,
    order.totals.totalQuantityIssued,
    order.totals.totalPrice,
    order.order.currency || 'USD'
  ]);

  csvContent = headers.join(',') + '\n';
  csvContent += summaryRows.map(row => row.join(',')).join('\n');

  
  csvContent = [...headers, ...detailHeaders].join(',') + '\n';
  for (const order of orders) {
    const baseRow = [
      order.order.id,
      new Date(order.order.date).toISOString().split('T')[0],
      `"${order.order.issueVoucherNo}"`,
      `"${order.order.voucherNo}"`,
      `"${order.order.requestingUnit}"`,
      `"${order.order.issuingStore}"`,
      `"${order.order.category}"`,
      `"${order.order.makeAndModel}"`,
      order.totals.totalItems,
      order.totals.totalQuantityIssued,
      order.totals.totalPrice,
      order.order.currency || 'USD'
    ];

    if (order.issuedItems.length === 0) {
      // No issued items — export base row with empty detail columns
      csvContent += [...baseRow, '', '', '', '', '', ''].join(',') + '\n';
    } else {
      // One row per issued item
      for (const item of order.issuedItems) {
        const detailRow = [
          `"${item.itemNo}"`,
          `"${item.stockNumber}"`,
          `"${item.description}"`,
          item.issued,
          item.unitPrice,
          item.totalPrice
        ];
        csvContent += [...baseRow, ...detailRow].join(',') + '\n';
      }
    }
  }


  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `RequestOrders_Report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
  loadReport(): void {
    const filter: RequestOrderReportFilter = {
      startDate: this.formGroup.get('startDate')?.value,
      endDate: this.formGroup.get('endDate')?.value,
      requestingUnit: this.formGroup.get('requestingUnit')?.value,
      issuingStore: this.formGroup.get('issuingStore')?.value,
      category: this.formGroup.get('category')?.value,
      makeAndModel: this.formGroup.get('makeAndModel')?.value,
      stockNumber: this.formGroup.get('stockNumber')?.value,
      description: this.formGroup.get('description')?.value,
    };
    this.requestService.getRequestOrdersReport(filter).subscribe({
      next: (response: RequestOrderReportResponse) => {
        // Explicitly type orders as OrderWithDetails[]
        const orders: OrderWithDetails[] = response.orders.map(order => ({
          ...order,
          showDetails: false,
        }));
        this.reportData = {
          ...response,
          orders,
        };
        console.log('Request Orders Report data loaded:', this.reportData);
      },
      error: (err: any) => {
        console.error('Error loading report:', err);
        this.reportData = {
          orders: [],
          summary: { totalOrders: 0, totalItems: 0, totalQuantityIssued: 0, totalPrice: 0 },
        };
      },
    });
  }

  resetFilter(): void {
    this.formGroup.reset();
    this.loadReport();
  }

  toggleDetails(order: OrderWithDetails): void {
    order.showDetails = !order.showDetails;
  }
}