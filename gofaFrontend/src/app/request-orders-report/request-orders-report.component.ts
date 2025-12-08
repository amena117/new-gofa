import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RequestService } from '../services/request.service';
import { RequestOrderReportFilter, RequestOrderReportResponse } from '../Mastercard/models/mastercard.model';

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