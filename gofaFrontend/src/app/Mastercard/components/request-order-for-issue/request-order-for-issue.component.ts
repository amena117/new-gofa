import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RequestOrderForIssue, IssuedItem } from '../../models/mastercard.model';
import { Router } from '@angular/router';
import { RequestService } from '../../../services/request.service';
import { AuthService } from '../../../services/auth.service'; // Adjust path as needed
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MasterCardService } from '../../../services/mastercard.service';

@Component({
  selector: 'app-request-order-for-issue',
  templateUrl: './request-order-for-issue.component.html',
  styleUrls: ['./request-order-for-issue.component.css']
})
export class RequestOrderForIssueComponent implements OnInit {
  requestOrderForm: FormGroup;
  currencies: string[] = ['USD', 'EUR', 'ETB', 'GBP'];
  currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    ETB: 'Br',
    GBP: '£'
  };

  // User details
  private userFirstName: string = '';
  private userLastName: string = '';

  // Ethiopian date properties
  private ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  ethiopianDateString: string = '';
  preparedByEthiopianDateString: string = '';
  verifiedByEthiopianDateString: string = '';
  approvedByEthiopianDateString: string = '';

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private authService: AuthService,
    public masterCardService: MasterCardService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.requestOrderForm = this.fb.group({
      date: [new Date(), Validators.required], // Will be overridden by backend date
      transactionDate: ['', Validators.required], // Added Transaction Date
      issueVoucherNo: ['', [Validators.required, Validators.maxLength(50)]],
      voucherNo: ['', [Validators.required, Validators.maxLength(50)]],
      isIssue: [true],
      requestingUnit: ['', [Validators.required, Validators.maxLength(100)]],
      issuingStore: ['', [Validators.required, Validators.maxLength(100)]],
      makeAndModel: ['', [Validators.required, Validators.maxLength(100)]],
      isServiceable: [true],
      category: ['', [Validators.required, Validators.maxLength(50)]],
      currency: ['USD', Validators.required],
      issuedItems: this.fb.array([]),
      preparedBy: this.fb.group({
        name: [{ value: '', disabled: true }, [Validators.required, Validators.maxLength(100)]],
        title: ['', [Validators.required, Validators.maxLength(100)]],
        jobResponsibility: ['', [Validators.required, Validators.maxLength(200)]],
        date: [new Date(), Validators.required]
      }),
      verifiedBy: this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(100)]],
        title: ['', [Validators.required, Validators.maxLength(100)]],
        jobResponsibility: ['', [Validators.required, Validators.maxLength(200)]],
        date: [new Date(), Validators.required]
      }),
      approvedBy: this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(100)]],
        title: ['', [Validators.required, Validators.maxLength(100)]],
        jobResponsibility: ['', [Validators.required, Validators.maxLength(200)]],
        date: [new Date(), Validators.required]
      })
    });
  }

  ngOnInit(): void {
    // Set Prepared By name
    this.userFirstName = this.authService.getFirstName() || 'Guest';
    this.userLastName = this.authService.getLastName() || 'User';
    const fullName = `${this.userFirstName} ${this.userLastName}`;
    this.requestOrderForm.patchValue({
      preparedBy: {
        name: fullName
      }
    });
    const preparedByNameControl = this.preparedBy.get('name');
    if (preparedByNameControl) {
      preparedByNameControl.disable();
    }

    this.addIssuedItem(); // Add one issued item by default
    this.loadCurrentDateFromBackend(); // Fetch and set date
  }

  // Add this near your other properties (e.g., after currencies)
issuingStores: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];

  // Load current date from backend and convert to Ethiopian
  loadCurrentDateFromBackend(): void {
    this.masterCardService.getCurrentDate().pipe(
      catchError((err: any) => {
        console.error('Error loading date from backend, falling back to local date:', err);
        const localDate = new Date();
        this.setAllDates(localDate);
        return of({ date: localDate.toISOString() });
      })
    ).subscribe({
      next: (response: { date: string }) => {
        const gregorianDate = new Date(response.date);
        if (isNaN(gregorianDate.getTime())) {
          console.error('Invalid date from backend:', response.date);
          this.setAllDates(new Date());
          return;
        }
        this.setAllDates(gregorianDate);
        console.log('Backend date set in form and converted to Ethiopian:', this.ethiopianDateString);
      },
      error: (err: any) => {
        console.error('Unexpected error loading backend date:', err);
        this.setAllDates(new Date());
      }
    });
  }

  // Set all date fields in the form and their Ethiopian displays
  private setAllDates(date: Date): void {
    this.requestOrderForm.patchValue({
      date: date,
      preparedBy: { date: date },
      verifiedBy: { date: date },
      approvedBy: { date: date }
    });
    this.setEthiopianDateString(date);
    this.setPreparedByEthiopianDate(date);
    this.setVerifiedByEthiopianDate(date);
    this.setApprovedByEthiopianDate(date);
    this.cdr.detectChanges();
  }

  // Convert Gregorian Date to Ethiopian string for each field
  private setEthiopianDateString(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.ethiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  private setPreparedByEthiopianDate(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.preparedByEthiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  private setVerifiedByEthiopianDate(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.verifiedByEthiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  private setApprovedByEthiopianDate(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.approvedByEthiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  // Ethiopian date conversion
  private toEthiopian(date: Date): { year: number; month: number; day: number } {
    const REFERENCE_GREGORIAN = new Date(2024, 8, 11); // Sep 11, 2024 = Meskerem 2, 2017 EC
    const REFERENCE_ETH_YEAR = 2017;
    const diffInMs = date.getTime() - REFERENCE_GREGORIAN.getTime();
    let totalDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    let ethYear = REFERENCE_ETH_YEAR;
    if (totalDays >= 0) {
      while (totalDays >= (this.isLeapYear(ethYear) ? 366 : 365)) {
        totalDays -= this.isLeapYear(ethYear) ? 366 : 365;
        ethYear++;
      }
    } else {
      while (totalDays < 0) {
        ethYear--;
        totalDays += this.isLeapYear(ethYear) ? 366 : 365;
      }
    }
    let ethMonth = Math.floor(totalDays / 30) + 1;
    let ethDay = (totalDays % 30) + 1;
    if (ethMonth > 13) {
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - 5;
      if (this.isLeapYear(ethYear - 1)) ethDay -= 1;
    } else if (ethMonth === 13 && ethDay > (this.isLeapYear(ethYear) ? 6 : 5)) {
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - (this.isLeapYear(ethYear - 1) ? 6 : 5);
    }
    return { year: ethYear, month: ethMonth, day: ethDay };
  }

  private isLeapYear(year: number): boolean {
    return year % 4 === 0;
  }

  get issuedItems(): FormArray {
    return this.requestOrderForm.get('issuedItems') as FormArray;
  }

  get preparedBy(): FormGroup {
    return this.requestOrderForm.get('preparedBy') as FormGroup;
  }

  get verifiedBy(): FormGroup {
    return this.requestOrderForm.get('verifiedBy') as FormGroup;
  }

  get approvedBy(): FormGroup {
    return this.requestOrderForm.get('approvedBy') as FormGroup;
  }

  get selectedCurrency(): string {
    return this.requestOrderForm.get('currency')?.value || 'USD';
  }

  getCurrencySymbol(): string {
    return this.currencySymbols[this.selectedCurrency] || '$';
  }

  addIssuedItem(): void {
    const issuedItemForm = this.fb.group({
      itemNo: ['', [Validators.required, Validators.maxLength(50)]],
      stockNumber: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(50)]],
      issued: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      totalPrice: [0]
    });

    issuedItemForm.get('issued')?.valueChanges.subscribe((value) => {
      console.log('issued changed:', value);
      this.updateTotalPrice(issuedItemForm);
    });
    issuedItemForm.get('unitPrice')?.valueChanges.subscribe((value) => {
      console.log('unitPrice changed:', value);
      this.updateTotalPrice(issuedItemForm);
    });

    this.updateTotalPrice(issuedItemForm);
    this.issuedItems.push(issuedItemForm);
  }

  removeIssuedItem(index: number): void {
    this.issuedItems.removeAt(index);
  }

  updateTotalPrice(formGroup: FormGroup): void {
    const issued = Number(formGroup.get('issued')?.value) || 0;
    const unitPrice = Number(formGroup.get('unitPrice')?.value) || 0;
    const totalPrice = issued * unitPrice;
    formGroup.get('totalPrice')?.setValue(totalPrice, { emitEvent: false });
    this.cdr.detectChanges();
    console.log(`Updated totalPrice: ${totalPrice} (issued: ${issued}, unitPrice: ${unitPrice})`);
  }

  onSubmit(): void {
    if (this.requestOrderForm.invalid) {
      this.requestOrderForm.markAllAsTouched();
      return;
    }

    const formValue = this.requestOrderForm.getRawValue();
    const requestOrder: RequestOrderForIssue = {
      date: formValue.date,
      transactionDate: formValue.transactionDate,
      issueVoucherNo: formValue.issueVoucherNo,
      voucherNo: formValue.voucherNo,
      isIssue: formValue.isIssue,
      requestingUnit: formValue.requestingUnit,
      issuingStore: formValue.issuingStore,
      makeAndModel: formValue.makeAndModel,
      isServiceable: formValue.isServiceable,
      category: formValue.category,
      currency: formValue.currency,
      issuedItems: formValue.issuedItems.map((item: any) => ({
        itemNo: item.itemNo,
        stockNumber: item.stockNumber,
        description: item.description,
        issued: Number(item.issued),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      })),
      preparedBy: formValue.preparedBy,
      verifiedBy: formValue.verifiedBy,
      approvedBy: formValue.approvedBy
    };

    console.log('Raw form values (includes disabled):', formValue);
    console.log('Submitting requestOrder:', JSON.stringify(requestOrder, null, 2));

    this.requestService.createRequestOrder(requestOrder).subscribe({
      next: (response) => {
        console.log('Request order created:', response);
        this.router.navigate(['/MasterCard/request-order-list']);
      },
      error: (error) => {
        console.error('Error creating request order:', error);
      }
    });
  }
}