import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RequestService } from '../../../services/request.service';
import { RequestOrderReportFilter, RequestOrderReportResponse } from '../../models/mastercard.model';
import * as XLSX from 'xlsx';

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
      period: [''],
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
  onPeriodChange(): void {
    const period = this.formGroup.get('period')?.value;
    if (!period) {
      this.formGroup.patchValue({ startDate: '', endDate: '' });
      return;
    }

    const months = parseInt(period, 10);
    if (!isNaN(months)) {
      const today = new Date();
      const startDate = new Date();
      startDate.setMonth(today.getMonth() - months);

      const endDateStr = today.toISOString().split('T')[0];
      const startDateStr = startDate.toISOString().split('T')[0];
      this.formGroup.patchValue({ startDate: startDateStr, endDate: endDateStr });
    }
  }

  exportToExcel(): void {
    const orders = this.reportData?.orders || [];
    if (orders.length === 0) return;

    try {
      const workbook = XLSX.utils.book_new();

      // 1. Request Orders Sheet
      const ordersData = orders.map((order, index) => ({
        'No / ተራ ቁጥር': index + 1,
        'ID / መለያ': order.order.id,
        'Date / ቀን': order.order.date ? new Date(order.order.date).toLocaleDateString() : '-',
        'Issue Voucher No / የወጪ ቫውቸር ቁጥር': order.order.issueVoucherNo || '-',
        'Voucher No / የቫውቸር ቁጥር': order.order.voucherNo || '-',
        'Requesting Unit / የጠየቀ ክፍል': order.order.requestingUnit || '-',
        'Issuing Store / የሚያወጣ መደብር': order.order.issuingStore || '-',
        'Category / ምድብ': order.order.category || '-',
        'Make and Model / ሰሪ እና ሞዴል': order.order.makeAndModel || '-',
        'Total Items / ጠቅላላ እቃዎች': order.totals.totalItems || 0,
        'Total Quantity / ጠቅላላ ብዛት': order.totals.totalQuantityIssued || 0,
        'Total Price / ጠቅላላ ዋጋ': order.totals.totalPrice || 0,
        'Currency / ገንዘብ አይነት': order.order.currency || 'ETB'
      }));

      const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
      ordersSheet['!cols'] = [
        { wch: 6 }, { wch: 8 }, { wch: 15 }, { wch: 22 }, { wch: 18 },
        { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Request Orders');

      // 2. Issued Items Details Sheet
      const itemsData: any[] = [];
      orders.forEach(order => {
        if (order.issuedItems && order.issuedItems.length > 0) {
          order.issuedItems.forEach(item => {
            itemsData.push({
              'Order ID / የትዕዛዝ መለያ': order.order.id,
              'Issue Voucher No / የወጪ ቫውቸር': order.order.issueVoucherNo || '-',
              'Requesting Unit / የጠየቀ ክፍል': order.order.requestingUnit || '-',
              'Item No / የእቃ ቁጥር': item.itemNo || '-',
              'Stock Number / የክምችት ቁጥር': item.stockNumber || '-',
              'Description / መግለጫ': item.description || '-',
              'Issued Qty / የተሰጠ ብዛት': item.issued || 0,
              'Unit Price / የአንድ እቃ ዋጋ': item.unitPrice || 0,
              'Total Price / ጠቅላላ ዋጋ': item.totalPrice || 0
            });
          });
        }
      });

      if (itemsData.length > 0) {
        const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
        itemsSheet['!cols'] = [
          { wch: 12 }, { wch: 22 }, { wch: 25 }, { wch: 15 },
          { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Issued Items Details');
      }

      // 3. Summary Sheet
      const periodVal = this.formGroup.get('period')?.value;
      const summaryData = [
        ['Request Orders Report Summary / የጥያቄ ትዕዛዝ ሪፖርት ማጠቃለያ'],
        ['Generated Date / የተፈጠረበት ቀን', new Date().toLocaleString()],
        ['Total Orders / ጠቅላላ ትዕዛዞች', this.reportData?.summary?.totalOrders || orders.length],
        ['Total Items / ጠቅላላ እቃዎች', this.reportData?.summary?.totalItems || 0],
        ['Total Quantity Issued / ጠቅላላ የተሰጠ ብዛት', this.reportData?.summary?.totalQuantityIssued || 0],
        ['Total Price / ጠቅላላ ዋጋ', this.reportData?.summary?.totalPrice || 0],
        [''],
        ['Filter Criteria / የማጣሪያ መመዘኛዎች'],
        ['Time Period / የጊዜ ገደብ', periodVal ? `${periodVal} Month(s)` : 'All Time'],
        ['Start Date / መነሻ ቀን', this.formGroup.get('startDate')?.value || 'All'],
        ['End Date / መጨረሻ ቀን', this.formGroup.get('endDate')?.value || 'All'],
        ['Requesting Unit / የጠየቀ ክፍል', this.formGroup.get('requestingUnit')?.value || 'All'],
        ['Issuing Store / የሚያወጣ መደብር', this.formGroup.get('issuingStore')?.value || 'All'],
        ['Category / ምድብ', this.formGroup.get('category')?.value || 'All'],
        ['Make and Model / ሰሪ እና ሞዴል', this.formGroup.get('makeAndModel')?.value || 'All']
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 35 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Save file
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `RequestOrders_Report_${dateStr}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }

  exportToCSV(): void {
    const orders = this.reportData?.orders || [];
    if (orders.length === 0) return;

    const headers = [
      'ID', 'Date', 'Issue Voucher No', 'Voucher No',
      'Requesting Unit', 'Issuing Store', 'Category', 'Make and Model',
      'Total Items', 'Total Quantity', 'Total Price', 'Currency'
    ];

    const detailHeaders = [
      'Item No', 'Stock Number', 'Description',
      'Issued Quantity', 'Unit Price', 'Item Total Price'
    ];

    let csvContent = '\uFEFF' + [...headers, ...detailHeaders].join(',') + '\n';
    for (const order of orders) {
      const baseRow = [
        order.order.id,
        order.order.date ? new Date(order.order.date).toISOString().split('T')[0] : '-',
        `"${order.order.issueVoucherNo || ''}"`,
        `"${order.order.voucherNo || ''}"`,
        `"${order.order.requestingUnit || ''}"`,
        `"${order.order.issuingStore || ''}"`,
        `"${order.order.category || ''}"`,
        `"${order.order.makeAndModel || ''}"`,
        order.totals.totalItems || 0,
        order.totals.totalQuantityIssued || 0,
        order.totals.totalPrice || 0,
        order.order.currency || 'ETB'
      ];

      if (!order.issuedItems || order.issuedItems.length === 0) {
        csvContent += [...baseRow, '', '', '', '', '', ''].join(',') + '\n';
      } else {
        for (const item of order.issuedItems) {
          const detailRow = [
            `"${item.itemNo || ''}"`,
            `"${item.stockNumber || ''}"`,
            `"${item.description || ''}"`,
            item.issued || 0,
            item.unitPrice || 0,
            item.totalPrice || 0
          ];
          csvContent += [...baseRow, ...detailRow].join(',') + '\n';
        }
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RequestOrders_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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