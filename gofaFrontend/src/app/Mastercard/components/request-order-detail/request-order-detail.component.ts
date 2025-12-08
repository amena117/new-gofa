import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestService } from '../../../services/request.service';
import { RequestOrderForIssue, IssuedItem } from '../../models/mastercard.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-request-order-detail',
  templateUrl: './request-order-detail.component.html',
  styleUrls: ['./request-order-detail.component.css']
})
export class RequestOrderDetailComponent implements OnInit {
  @ViewChild('content', { static: false }) content!: ElementRef;
  requestOrder: RequestOrderForIssue | null = null;
  editableRequestOrder: RequestOrderForIssue | null = null;
  isExporting: boolean = false;
  isEditing: boolean = false;
  isSaving: boolean = false;
  private originalRequestOrder: RequestOrderForIssue | null = null;
  private ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    ETB: 'Br',
    GBP:'£'
     
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requestService: RequestService,
    private authService: AuthService
  ) {}

  currentUserFullName: string | null = null;

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserFullName = `${user.firstName} ${user.lastName || ''}`.trim();
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.requestService.getRequestOrder(+id).subscribe({
        next: (data) => {
          this.requestOrder = data;
          this.originalRequestOrder = JSON.parse(JSON.stringify(data));
          if (this.requestOrder && !this.requestOrder.issuedItems) {
            this.requestOrder.issuedItems = [];
          }
        },
        error: (error) => {
          console.error('Error fetching request order:', error);
          alert('Failed to load request order. Please try again.');
        }
      });
    }
  }

  canUserEdit(): boolean {
    if (!this.requestOrder?.preparedBy?.name || !this.currentUserFullName) {
      return false;
    }
    return this.requestOrder.preparedBy.name.trim().toLowerCase() ===
           this.currentUserFullName.trim().toLowerCase();
  }

  formatDate(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return 'N/A / የለም';
    let dateObj: Date;
    try {
      if (dateInput instanceof Date) {
        dateObj = dateInput;
      } else if (typeof dateInput === 'string') {
        const trimmedInput = dateInput.trim();
        if (trimmedInput.startsWith('0001-01-01') || trimmedInput.startsWith('0000-12-31')) {
          return 'N/A / የለም';
        }
        dateObj = new Date(dateInput);
      } else {
        console.warn('Unexpected date input type for formatDate:', typeof dateInput, dateInput);
        return 'Invalid Date / ትክክል ያልሆነ ቀን';
      }
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid Date object created from input:', dateInput);
        return 'Invalid Date / ትክክል ያልሆነ ቀን';
      }
      const gregorianDateString = dateObj.toLocaleDateString('en-GB');
      const ethiopianDateString = this.toEthiopianDate(dateObj);
      return `${ethiopianDateString} / ${gregorianDateString}`;
    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      return 'Invalid Date / ትክክል ያልሆነ ቀን';
    }
  }

  private toEthiopianDate(date: Date): string {
    const REFERENCE_GREGORIAN = new Date(2024, 8, 11);
    const REFERENCE_ETH_YEAR = 2017;
    const diffInMs = date.getTime() - REFERENCE_GREGORIAN.getTime();
    let totalDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    let ethYear = REFERENCE_ETH_YEAR;
    if (totalDays >= 0) {
      while (totalDays >= (this.isLeapYearEth(ethYear) ? 366 : 365)) {
        totalDays -= this.isLeapYearEth(ethYear) ? 366 : 365;
        ethYear++;
      }
    } else {
      while (totalDays < 0) {
        ethYear--;
        totalDays += this.isLeapYearEth(ethYear) ? 366 : 365;
      }
    }
    const ethMonthIndex = Math.floor(totalDays / 30);
    const ethDay = (totalDays % 30) + 1;
    const validEthMonthIndex = ethMonthIndex >= 0 && ethMonthIndex < this.ethMonthNames.length ? ethMonthIndex : 0;
    return `${ethDay} ${this.ethMonthNames[validEthMonthIndex]} ${ethYear}`;
  }

  private isLeapYearEth(year: number): boolean {
    return year % 4 === 0;
  }

  getCurrencySymbol(): string {
    const currency = this.isEditing && this.editableRequestOrder ? this.editableRequestOrder.currency : this.requestOrder?.currency;
    return this.currencySymbols[currency ?? 'USD'] ?? '$';
  }

 exportToPDF(): void {
  if (!this.requestOrder) {
    console.warn('No request order data to export.');
    return;
  }

  this.isExporting = true;

  setTimeout(() => {
    const element = this.content.nativeElement;

    html2canvas(element, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Scale image to fit PDF width
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 1;

      const addHeaderAndFooter = () => {
        pdf.setFontSize(10);
        pdf.text(`Request Order Details (ID: ${this.requestOrder!.id})`, 10, 10);
        pdf.text(`Page ${pageNumber}`, pdfWidth - 20, pdfHeight - 10);
      };

      // First page
      addHeaderAndFooter();
      pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight); // leave space for header
      heightLeft -= pdfHeight;

      // Remaining pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageNumber++;
        addHeaderAndFooter();
        pdf.addImage(imgData, 'PNG', 0, position + 20, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`RequestOrder_${this.requestOrder!.id}_${dateStr}.pdf`);

      this.isExporting = false;
    }).catch(error => {
      console.error('Error generating PDF:', error);
      this.isExporting = false;
      alert('Failed to generate PDF. Please try again.');
    });
  }, 100);
}


  goBack(): void {
    this.router.navigate(['/MasterCard/request-order-list']);
  }

  startEdit(): void {
    if (this.requestOrder) {
      this.editableRequestOrder = JSON.parse(JSON.stringify(this.requestOrder));
      if (this.editableRequestOrder) {
        this.editableRequestOrder.issuedItems = this.editableRequestOrder.issuedItems
          ? this.editableRequestOrder.issuedItems.map(item => ({
              ...item,
              id: 0
            }))
          : [];
        this.isEditing = true;
      }
    }
  }

  cancelEdit(): void {
    if (this.originalRequestOrder) {
      this.requestOrder = JSON.parse(JSON.stringify(this.originalRequestOrder));
    }
    this.editableRequestOrder = null;
    this.isEditing = false;
    this.isSaving = false;
  }

  saveChanges(): void {
    if (!this.editableRequestOrder) {
      console.warn('No editable data to save.');
      return;
    }
    // Validate issued items
    const invalidItems = this.editableRequestOrder.issuedItems?.some(item => 
      !item.itemNo?.trim() || 
      !item.stockNumber?.trim() || 
      !item.description?.trim() || 
      item.issued == null || item.issued < 0 || 
      item.unitPrice == null || item.unitPrice < 0
    );
    if (invalidItems) {
      alert('Please ensure all issued items have valid item number, stock number, description, non-negative quantity, and unit price.');
      return;
    }
    const orderId = this.editableRequestOrder.id;
    if (orderId == null || orderId <= 0) {
      console.error('Invalid Order ID for update.');
      alert('Invalid Order ID. Please try again.');
      this.isSaving = false;
      return;
    }
    const uniqueItems = new Map<string, IssuedItem>();
    (this.editableRequestOrder.issuedItems || []).forEach(item => {
      const key = `${item.stockNumber}-${item.description}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });
    const payload: RequestOrderForIssue = {
      ...this.editableRequestOrder,
      issuedItems: Array.from(uniqueItems.values()).map(item => ({
        ...item,
        id: 0,
        requestOrderForIssueId: orderId,
        totalPrice: (item.issued ?? 0) * (item.unitPrice ?? 0)
      }))
    };
    console.log('Payload sent to backend:', JSON.stringify(payload, null, 2));
    this.isSaving = true;
    this.requestService.updateRequestOrder(orderId, payload).subscribe({
      next: (updatedOrder: RequestOrderForIssue) => {
        console.log('Request Order updated successfully:', JSON.stringify(updatedOrder, null, 2));
        this.requestOrder = updatedOrder;
        this.originalRequestOrder = JSON.parse(JSON.stringify(updatedOrder));
        this.editableRequestOrder = null;
        this.isEditing = false;
        this.isSaving = false;
        alert('Order updated successfully!');
      },
      error: (error) => {
        console.error('Error updating request order:', error);
        this.isSaving = false;
        alert('Failed to update order. Please try again.');
      }
    });
  }

  calculateTotalPriceInEditMode(index: number): number {
    if (this.isEditing && this.editableRequestOrder && this.editableRequestOrder.issuedItems && index >= 0 && index < this.editableRequestOrder.issuedItems.length) {
      const item = this.editableRequestOrder.issuedItems[index];
      const issued = item?.issued ?? 0;
      const unitPrice = item?.unitPrice ?? 0;
      return issued * unitPrice;
    }
    return 0;
  }

  addNewIssuedItem(): void {
    if (this.editableRequestOrder) {
      const newItem: IssuedItem = {
        id: 0,
        requestOrderForIssueId: this.editableRequestOrder.id,
        itemNo: '',
        stockNumber: '',
        description: '',
        issued: 0,
        unitPrice: 0,
        totalPrice: 0
      };
      this.editableRequestOrder.issuedItems = this.editableRequestOrder.issuedItems || [];
      this.editableRequestOrder.issuedItems.push(newItem);
    }
  }

  // removeIssuedItem(index: number): void {
  //   if (this.editableRequestOrder && this.editableRequestOrder.issuedItems && confirm('Are you sure you want to remove this item? / ይህን እቃ ማስወገድ እርግጠኛ ነዎት?')) {
  //     this.editableRequestOrder.issuedItems.splice(index, 1);
  //   }
  // }
}