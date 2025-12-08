import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ItemService } from '../../services/item.service';
import { Model22Service } from '../../services/model22.service';
import { AuthService } from '../../services/auth.service';
import { Item, TransactionEntry, UpdateItemRequest, Accessory } from '../../model/item.model';
import { Model22Dto } from '../../model/model22';
import { Subscription, forkJoin, of } from 'rxjs';
import { filter, switchMap, catchError, finalize } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-item-details',
  templateUrl: './item-details.component.html',
  styleUrls: ['./item-details.component.css']
})
export class ItemDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('itemDetails', { static: false }) itemDetails!: ElementRef;
  item: Item | null = null;
  transactions: TransactionEntry[] = [];
  transactionWithdrawals: TransactionEntry[] = [];
  model22Withdrawals: Array<{
    withdrawal: Model22Dto;
    description: string;
    currency: string;
    serialNumbers: string[];
    quantity: number;
    sortableDate: Date;
  }> = [];
  errorMessage: string | null = null;
  debugInfo: string | null = null;
  isLoading = false;
  isWithdrawalsLoading = false;
  isEditing = false;
  isSubmitting = false;
  
  // Edit Form
  editForm!: FormGroup;
  availableCategories: string[] = [];
  availableSources: string[] = [];
  availableCurrencies: string[] = [];
  availableWarehouses: any[] = [];
  
  private routerSubscription: Subscription | null = null;
  private userCache: Map<string, { firstName: string; lastName?: string }> = new Map();
  private pendingUserRequests: Map<string, boolean> = new Map();
  private dateCache = new Map<string, number>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemService: ItemService,
    private model22Service: Model22Service,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      console.log('ItemDetails: Loading item with ID:', itemId);
      this.loadItemDetails(+itemId);
      this.loadModel22Withdrawals(+itemId);
      this.loadDropdownData();
      
      this.routerSubscription = this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          console.log('ItemDetails: Navigation event detected, refreshing item details');
          this.loadItemDetails(+itemId);
          this.loadModel22Withdrawals(+itemId);
        });
    } else {
      this.errorMessage = 'Invalid item ID / ልክ ያልሆነ የእቃ መለያ';
      console.error('ItemDetails: No item ID provided');
    }
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private initForm(): void {
    this.editForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      model: ['', Validators.required],
      shelf: [''],
      itemColumn: [''],
      itemRow: [''],
      condition: [''],
      numOfBox: [null],
      voucherNumber: [''],
      receivedFrom: [''],
      unitPrice: [0, [Validators.min(0)]],
      currency: ['ETB'],
      source: [''],
      warehouseId: [{ value: '', disabled: true }, Validators.required],
      role: [{ value: '', disabled: true }]
    });
  }

  private loadDropdownData(): void {
    // Load categories
    this.itemService.getCategories().subscribe({
      next: (categories) => {
        this.availableCategories = categories;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.availableCategories = [];
      }
    });

    // Load sources
    this.itemService.getSources().subscribe({
      next: (sources) => {
        this.availableSources = sources;
      },
      error: (err) => {
        console.error('Error loading sources:', err);
        this.availableSources = ['Purchase', 'Return', 'Donation', 'Transfer'];
      }
    });

    // Load currencies
    this.itemService.getCurrencies().subscribe({
      next: (currencies) => {
        this.availableCurrencies = currencies;
      },
      error: (err) => {
        console.error('Error loading currencies:', err);
        this.availableCurrencies = ['ETB', 'USD', 'EURO', 'POUND', 'FOC'];
      }
    });

    // Load warehouses
    this.itemService.getWarehouses().subscribe({
      next: (warehouses) => {
        this.availableWarehouses = warehouses;
      },
      error: (err) => {
        console.error('Error loading warehouses:', err);
        this.availableWarehouses = [];
      }
    });
  }

  loadItemDetails(itemId: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.debugInfo = null;

    this.itemService.getItem(itemId).subscribe({
      next: (item) => {
        console.log('ItemDetails: Full item response:', item);
        console.log('ItemDetails: Transaction history from item:', item.transactionHistory);
        console.log('ItemDetails: Serial numbers:', item.serialNumbers);
        console.log('ItemDetails: Raw accessories data:', item.accessories);
        
        // Log each accessory with its pricing for debugging
        if (item.accessories && item.accessories.length > 0) {
          item.accessories.forEach((accessory, index) => {
            console.log(`Accessory ${index + 1}:`, {
              name: accessory.name,
              model: accessory.model,
              quantity: accessory.quantity,
              unitPrice: accessory.unitPrice,
              currency: accessory.currency,
              hasUnitPrice: accessory.unitPrice !== undefined && accessory.unitPrice !== null,
              hasCurrency: accessory.currency !== undefined && accessory.currency !== null
            });
          });
        }
        
        // Ensure accessories have proper default values
        if (item.accessories) {
          item.accessories = item.accessories.map(accessory => ({
            ...accessory,
            unitPrice: accessory.unitPrice !== undefined && accessory.unitPrice !== null ? accessory.unitPrice : 0,
            currency: accessory.currency || 'ETB'
          }));
        }

        this.item = { ...item };
        this.populateForm(item);

        if (item.transactionHistory && Array.isArray(item.transactionHistory)) {
          console.log('ItemDetails: Raw transactions from item:', item.transactionHistory);
          const actionValues = [...new Set(item.transactionHistory.map(t => t.action?.toLowerCase() || ''))];
          console.log('ItemDetails: Unique action values from item:', actionValues);

          // Process and sort transactions
          this.processAndSortTransactions(item.transactionHistory);

          if (this.transactions.length === 0 && this.transactionWithdrawals.length === 0) {
            this.debugInfo = `No transactions found. Total transactions: ${item.transactionHistory.length}, Actions: ${actionValues.join(', ') || 'None'}`;
            console.warn('ItemDetails: No transactions found');
          }

          // Fetch user details for transactions and registeredBy
          const transactionsToProcess = [...this.transactions, ...this.transactionWithdrawals];
          if (item.registeredBy) {
            transactionsToProcess.push({ details: `Registered By: ${item.registeredBy}` } as TransactionEntry);
          }
          this.fetchUserDetailsForTransactions(transactionsToProcess);
        } else {
          console.warn('ItemDetails: No transaction history found in item response');
          this.debugInfo = 'No transaction history available for this item / ለዚህ እቃ የግብይት ታሪክ የለም';
          this.transactions = [];
          this.transactionWithdrawals = [];
          // Fetch user details for registeredBy even if no transactions
          if (item.registeredBy) {
            this.fetchUserDetailsForTransactions([{ details: `Registered By: ${item.registeredBy}` } as TransactionEntry]);
          }
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load item details: ' + (err.message || 'Unknown error') + ' / የእቃ ዝርዝሮችን መጫን አልተሳካም';
        console.error('ItemDetails: Error loading item:', err);
        this.isLoading = false;
      }
    });
  }

  // NEW: Format accessory price method
  formatAccessoryPrice(unitPrice: number | undefined, currency: string | undefined, quantity: number): string {
    const price = unitPrice || 0;
    const curr = currency || 'ETB';
    const totalPrice = price * quantity;
    return `${totalPrice.toFixed(2)} ${curr}`;
  }

  // Process and sort transactions by date and time (newest first)
  private processAndSortTransactions(transactions: TransactionEntry[]): void {
    // Filter receive transactions
    this.transactions = transactions
      .filter(transaction => transaction.action?.toLowerCase() === 'receive')
      .map(transaction => {
        const parsed = this.parseTransactionDetails(transaction);
        return {
          ...transaction,
          unitPrice: transaction.unitPrice ?? parsed.unitPrice,
          currency: transaction.currency ?? parsed.currency,
          sortableDate: this.parseTransactionDate(transaction)
        };
      });

    // Filter withdrawal transactions
    this.transactionWithdrawals = transactions
      .filter(transaction => transaction.action?.toLowerCase() === 'withdrawn')
      .map(transaction => ({
        ...transaction,
        sortableDate: this.parseTransactionDate(transaction)
      }));

    // Sort both arrays by date and time (newest first)
    this.transactions.sort((a, b) => b.sortableDate.getTime() - a.sortableDate.getTime());
    this.transactionWithdrawals.sort((a, b) => b.sortableDate.getTime() - a.sortableDate.getTime());

    console.log('ItemDetails: Sorted receive transactions (newest first):', this.transactions);
    console.log('ItemDetails: Sorted transaction withdrawals (newest first):', this.transactionWithdrawals);
  }

  // Parse transaction date with time consideration
  private parseTransactionDate(transaction: TransactionEntry): Date {
    if (transaction.date) {
      // Try to parse the date string
      const date = new Date(transaction.date);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Handle Ethiopian date format if needed
      const ethiopianDate = this.parseEthiopianDateWithTime(transaction.date);
      if (ethiopianDate) {
        return ethiopianDate;
      }
    }
    
    // Fallback: use current date for transactions without date
    console.warn('ItemDetails: No valid date found for transaction, using current date:', transaction);
    return new Date();
  }

  // Parse Ethiopian date with time consideration
  private parseEthiopianDateWithTime(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Check if it's a standard ISO date string
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Handle Ethiopian date format (e.g., "ጥቅምት 5, 2018")
      const [monthStr, day, year] = dateStr.split(/[\s,]+/);
      const ethMonths = [
        'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
        'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
      ];
      const monthIndex = ethMonths.indexOf(monthStr);
      if (monthIndex === -1 || !day || !year) {
        return null;
      }
      
      // Approximate conversion to Gregorian
      const gregorianYear = parseInt(year) + 7;
      return new Date(gregorianYear, monthIndex, parseInt(day));
    } catch (error) {
      console.warn('ItemDetails: Error parsing Ethiopian date with time:', dateStr, error);
      return null;
    }
  }

  private populateForm(item: Item): void {
    this.editForm.patchValue({
      description: item.description || '',
      category: item.category || '',
      model: item.model || '',
      shelf: item.shelf || '',
      itemColumn: item.itemColumn || '',
      itemRow: item.itemRow || '',
      condition: item.condition || '',
      numOfBox: item.numOfBox || null,
      voucherNumber: item.voucherNumber || '',
      receivedFrom: item.receivedFrom || '',
      unitPrice: item.unitPrice || 0,
      currency: item.currency || 'ETB',
      source: item.source || '',
      warehouseId: item.warehouseId || '',
      role: item.role || ''
    });
  }

  // Edit Methods
  enableEditing(): void {
    this.isEditing = true;
    window.scrollTo(0, 0);
  }

  cancelEditing(): void {
    this.isEditing = false;
    if (this.item) {
      this.populateForm(this.item);
    }
  }

  onSubmit(): void {
    if (this.editForm.invalid || !this.item || !this.item.itemId) {
      this.markFormGroupTouched();
      if (!this.item?.itemId) {
        this.errorMessage = 'Invalid item ID / ልክ ያልሆነ የእቃ መለያ';
      }
      return;
    }

    this.isSubmitting = true;
    const formValue = this.editForm.value;
    
    const updateRequest: UpdateItemRequest = {
      editedBy: this.authService.getUsername() || 'Unknown',
      description: formValue.description,
      category: formValue.category,
      model: formValue.model,
      shelf: formValue.shelf,
      itemColumn: formValue.itemColumn,
      itemRow: formValue.itemRow,
      condition: formValue.condition,
      numOfBox: formValue.numOfBox,
      voucherNumber: formValue.voucherNumber,
      receivedFrom: formValue.receivedFrom,
      unitPrice: formValue.unitPrice,
      currency: formValue.currency,
      source: formValue.source,
      warehouseId: formValue.warehouseId,
      role: formValue.role
    };

    this.itemService.updateItem(this.item.itemId!, updateRequest).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.isEditing = false;
        
        if (response.success) {
          this.errorMessage = null;
          this.loadItemDetails(this.item!.itemId!);
          
          this.debugInfo = 'Item updated successfully / እቃው በትክክል ተቀይሯል';
          setTimeout(() => {
            this.debugInfo = null;
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Failed to update item / እቃውን ማዘመን አልተሳካም';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Error updating item: ' + (err.message || 'Unknown error') + ' / እቃውን በማዘመን ላይ ስህተት ተከስቷል';
        console.error('Error updating item:', err);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.editForm.controls).forEach(key => {
      const control = this.editForm.get(key);
      control?.markAsTouched();
    });
  }

  // Form field validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'This field is required / ይህ መስክ አስፈላጊ ነው';
      }
      if (field.errors['minlength']) {
        return `Minimum length is ${field.errors['minlength'].requiredLength} characters / ዝቅተኛው ርዝመት ${field.errors['minlength'].requiredLength} ፊደሎች ነው`;
      }
      if (field.errors['min']) {
        return `Value must be at least ${field.errors['min'].min} / እሴቱ ቢያንስ ${field.errors['min'].min} መሆን አለበት`;
      }
    }
    return '';
  }

  loadModel22Withdrawals(itemId: number): void {
    this.isWithdrawalsLoading = true;
    const userRole = this.authService.getRole()?.toUpperCase();

    if (!userRole) {
      console.warn('ItemDetails: No user role found');
      this.errorMessage = 'No or invalid role. Please contact the administrator. / የለም ወይም ልክ ያልሆነ ሚና። እባክዎ አስተዳዳሪውን ያነጋግሩ።';
      this.isWithdrawalsLoading = false;
      return;
    }

    this.model22Service.getModel22s(userRole).pipe(
      catchError(err => {
        console.error('ItemDetails: Error loading Model22 withdrawals:', err);
        this.errorMessage = 'Failed to load Model22 withdrawals: ' + (err.message || 'Unknown error') + ' / ሞዴል 22 ማውጣቶችን መጫን አልተሳካም';
        return of([]);
      }),
      finalize(() => {
        this.isWithdrawalsLoading = false;
      })
    ).subscribe((allWithdrawals: Model22Dto[]) => {
      console.log('ItemDetails: Raw Model22 API response:', allWithdrawals);
      
      if (!this.item) {
        this.itemService.getItem(itemId).pipe(
          catchError(err => {
            console.error('ItemDetails: Error loading item for withdrawal filtering:', err);
            this.errorMessage = 'Failed to load item for Model22 withdrawal filtering: ' + (err.message || 'Unknown error') + ' / ለሞዴል 22 ማውጣት ማጣሪያ እቃ መጫን አልተሳካም';
            return of(null);
          })
        ).subscribe({
          next: (item) => {
            if (item) {
              this.item = item;
              this.filterAndSortModel22Withdrawals(allWithdrawals);
            } else {
              this.model22Withdrawals = [];
            }
          }
        });
      } else {
        this.filterAndSortModel22Withdrawals(allWithdrawals);
      }
    });
  }

  // Filter and sort Model22 withdrawals by date (newest first)
  private filterAndSortModel22Withdrawals(allWithdrawals: Model22Dto[]): void {
    if (!this.item) {
      this.model22Withdrawals = [];
      console.warn('ItemDetails: No item available for filtering Model22 withdrawals');
      return;
    }

    this.model22Withdrawals = allWithdrawals
      .filter(withdrawal =>
        withdrawal.items?.some(
          item =>
            item.description?.toLowerCase() === this.item!.description?.toLowerCase() &&
            item.model?.toLowerCase() === this.item!.model?.toLowerCase()
        )
      )
      .map(withdrawal => {
        const itemInWithdrawal = withdrawal.items?.find(
          item =>
            item.description?.toLowerCase() === this.item!.description?.toLowerCase() &&
            item.model?.toLowerCase() === this.item!.model?.toLowerCase()
        );
        return {
          withdrawal,
          description: itemInWithdrawal?.description || withdrawal.description || 'Unknown / ያልታወቀ',
          currency: itemInWithdrawal?.currency || 'N/A',
          serialNumbers: itemInWithdrawal?.serialNumbers || [],
          quantity: itemInWithdrawal?.quantity || 0,
          sortableDate: this.parseEthiopianDateWithTime(withdrawal.ethiopianDate || '') || new Date(0)
        };
      })
      // Sort Model22 withdrawals by date (newest first)
      .sort((a, b) => b.sortableDate.getTime() - a.sortableDate.getTime());

    console.log('ItemDetails: Sorted Model22 withdrawals for this item (newest first):', this.model22Withdrawals);
    
    // Fetch user details for Model22 withdrawals
    const model22Usernames = this.model22Withdrawals
      .filter(w => w.withdrawal.registeredBy)
      .map(w => w.withdrawal.registeredBy!)
      .filter(username => username && !this.userCache.has(username));
    
    if (model22Usernames.length > 0) {
      this.fetchUserDetailsBatch(model22Usernames);
    }
  }

  private fetchUserDetailsForTransactions(transactions: TransactionEntry[]): void {
    const usernames = new Set<string>();

    transactions.forEach(transaction => {
      if (transaction.details) {
        const issuedToMatch = transaction.details.match(/Issued To: ([^,]+)/);
        const registeredByMatch = transaction.details.match(/Registered By: ([^,]+)/);
        if (issuedToMatch) usernames.add(issuedToMatch[1].trim());
        if (registeredByMatch) usernames.add(registeredByMatch[1].trim());
      }
    });

    const usernamesToFetch = Array.from(usernames).filter(username => 
      username && username !== 'Unknown' && !this.userCache.has(username) && !this.pendingUserRequests.has(username)
    );

    if (usernamesToFetch.length > 0) {
      this.fetchUserDetailsBatch(usernamesToFetch);
    }
  }

  private fetchUserDetailsBatch(usernames: string[]): void {
    if (usernames.length === 0) return;

    usernames.forEach(username => this.pendingUserRequests.set(username, true));

    const requests = usernames.map(username => 
      this.authService.getUserByUsername(username).pipe(
        catchError(err => {
          console.error(`Failed to fetch user details for username: ${username}`, err);
          return of(null);
        })
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        results.forEach((userInfo, index) => {
          const username = usernames[index];
          this.pendingUserRequests.delete(username);
          
          if (userInfo) {
            this.userCache.set(username, {
              firstName: userInfo.firstName,
              lastName: userInfo.lastName
            });
          } else {
            this.userCache.set(username, { firstName: 'Unknown', lastName: '' });
          }
        });
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error in batch user fetch:', err);
        usernames.forEach(username => {
          this.pendingUserRequests.delete(username);
          this.userCache.set(username, { firstName: 'Unknown', lastName: '' });
        });
        this.cdr.detectChanges();
      }
    });
  }

  getRegisteredByFullName(username: string | null | undefined): string {
    console.log('getRegisteredByFullName called with:', username);
    
    if (!username || username === 'Unknown' || username === 'anonymous') {
      return 'Unknown / ያልታወቀ';
    }

    const userInfo = this.userCache.get(username);
    if (userInfo) {
      const fullName = `${userInfo.firstName} ${userInfo.lastName || ''}`.trim();
      return fullName || username;
    }

    if (!this.pendingUserRequests.has(username) && username !== 'anonymous') {
      this.pendingUserRequests.set(username, true);
      
      console.log('Fetching user info for username:', username);
      
      this.authService.getUserByUsername(username).pipe(
        catchError(err => {
          console.error(`Failed to fetch user details for username: ${username}`, err);
          this.pendingUserRequests.delete(username);
          this.userCache.set(username, { firstName: 'Unknown', lastName: '' });
          this.cdr.detectChanges();
          return of(null);
        })
      ).subscribe({
        next: (userInfo) => {
          this.pendingUserRequests.delete(username);
          
          if (userInfo && userInfo.firstName) {
            console.log('User info found:', userInfo);
            this.userCache.set(username, {
              firstName: userInfo.firstName,
              lastName: userInfo.lastName
            });
          } else {
            console.log('No user info found for:', username);
            this.userCache.set(username, { firstName: 'Unknown', lastName: '' });
          }
          
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error in user fetch:', err);
          this.pendingUserRequests.delete(username);
          this.userCache.set(username, { firstName: 'Unknown', lastName: '' });
          this.cdr.detectChanges();
        }
      });
    }

    return 'Loading... / በመጫን ላይ...';
  }

  private parseTransactionDetails(transaction: TransactionEntry): { unitPrice: number; currency: string } {
    if (!transaction.details) {
      return { unitPrice: this.item?.unitPrice || 0, currency: this.item?.currency || 'ETB' };
    }

    const unitPriceMatch = transaction.details.match(/Unit Price: (\d+\.?\d*)/);
    const currencyMatch = transaction.details.match(/Currency: ([A-Z]+)/);

    return {
      unitPrice: unitPriceMatch ? parseFloat(unitPriceMatch[1]) : (this.item?.unitPrice || 0),
      currency: currencyMatch ? currencyMatch[1] : (this.item?.currency || 'ETB')
    };
  }

  getRecipientFromTransaction(withdrawal: TransactionEntry): string {
    if (!withdrawal.details) return 'Unknown / ያልታወቀ';

    const issuedToMatch = withdrawal.details.match(/Issued To: ([^,]+)/);
    const username = issuedToMatch ? issuedToMatch[1].trim() : 'Unknown';
    
    if (username === 'Unknown') {
      return 'Unknown / ያልታወቀ';
    }

    const userInfo = this.userCache.get(username);
    if (userInfo) {
      return `${userInfo.firstName} ${userInfo.lastName || ''}`.trim() || 'Unknown / ያልታወቀ';
    }
    
    if (!this.pendingUserRequests.has(username)) {
      this.getRegisteredByFullName(username);
    }
    
    return 'Loading... / በመጫን ላይ...';
  }

  getPerformedByFromTransaction(withdrawal: TransactionEntry): string {
    if (!withdrawal.details) return 'Unknown / ያልታወቀ';

    const performedByMatch = withdrawal.details.match(/Registered By: ([^,]+)/);
    const username = performedByMatch ? performedByMatch[1].trim() : 'Unknown';
    
    if (username === 'Unknown') {
      return 'Unknown / ያልታወቀ';
    }

    const userInfo = this.userCache.get(username);
    if (userInfo) {
      return `${userInfo.firstName} ${userInfo.lastName || ''}`.trim() || 'Unknown / ያልታወቀ';
    }
    
    if (!this.pendingUserRequests.has(username)) {
      this.getRegisteredByFullName(username);
    }
    
    return 'Loading... / በመጫን ላይ...';
  }

  getRegisteredByFromModel22(withdrawal: Model22Dto): string {
    const username = withdrawal.registeredBy || 'Unknown';
    
    if (username === 'Unknown') {
      return 'Unknown / ያልታወቀ';
    }

    const userInfo = this.userCache.get(username);
    if (userInfo) {
      return `${userInfo.firstName} ${userInfo.lastName || ''}`.trim() || 'Unknown / ያልታወቀ';
    }
    
    if (!this.pendingUserRequests.has(username)) {
      this.getRegisteredByFullName(username);
    }
    
    return 'Loading... / በመጫን ላይ...';
  }

  formatPrice(unitPrice: number, currency: string, quantity: number = 1): string {
    const totalPrice = unitPrice * quantity;
    return `${totalPrice.toFixed(2)} ${currency}`;
  }

  navigateBack(): void {
    this.router.navigate(['/items']);
  }

  printPage(): void {
    this.closeSidebar();
    setTimeout(() => {
      window.print();
    }, 100);
  }

  downloadAsPDF(): void {
    this.closeSidebar();

    if (!this.itemDetails || !this.itemDetails.nativeElement) {
      console.error('Item details element not available for PDF generation');
      this.errorMessage = 'Failed to generate PDF / PDF መፍጠር አልተሳካም';
      return;
    }

    const element = this.itemDetails.nativeElement;

    document.body.classList.add('print-mode');
    const buttonGroup = element.querySelector('.button-group');
    if (buttonGroup) {
      buttonGroup.classList.add('hide-for-pdf');
    }

    setTimeout(() => {
      html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);

        while (heightLeft > pageHeight - 2 * margin) {
          pdf.addPage();
          position = -(heightLeft - (pageHeight - 2 * margin));
          heightLeft -= pageHeight - 2 * margin;
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        }

        pdf.save(`item-details-${this.item?.itemId || 'unknown'}.pdf`);

        document.body.classList.remove('print-mode');
        if (buttonGroup) {
          buttonGroup.classList.remove('hide-for-pdf');
        }
      }).catch(error => {
        console.error('Error generating PDF:', error);
        this.errorMessage = 'Failed to generate PDF / PDF መፍጠር አልተሳካም';

        document.body.classList.remove('print-mode');
        if (buttonGroup) {
          buttonGroup.classList.remove('hide-for-pdf');
        }
      });
    }, 100);
  }

  private closeSidebar(): void {
    document.body.classList.remove('sidebar-open');
  }

  formatEthiopianDate(date: string | null): string {
    if (!date || date === 'Unknown Date') {
      return 'ያልታወቀ ቀን';
    }
    try {
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
        const [year, month, day] = date.split('/').map(Number);
        const amharicMonth = this.getAmharicMonthName(month);
        return `${amharicMonth} ${day}, ${year}`;
      }
      if (/[\u1200-\u137F]/.test(date)) {
        return date;
      }
      const parts = date.split(/[\s,]+/).filter(part => part);
      if (parts.length < 3) {
        return date;
      }
      const monthName = parts[0];
      const day = parts[1];
      const year = parts[2];
      const monthNumber = this.getEthiopianMonthNumber(monthName);
      const amharicMonth = this.getAmharicMonthName(monthNumber);
      return `${amharicMonth} ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting Ethiopian date:', error);
      return date || 'ያልታወቀ ቀን';
    }
  }

  private getEthiopianMonthNumber(monthName: string): number {
    const monthMap: { [key: string]: number } = {
      'Meskerem': 1, 'መስከረም': 1,
      'Tikimt': 2, 'ጥቅምት': 2,
      'Hidar': 3, 'ህዳር': 3,
      'Tahsas': 4, 'ታህሳስ': 4,
      'Tir': 5, 'ጥር': 5,
      'Yekatit': 6, 'የካቲት': 6,
      'Megabit': 7, 'መጋቢት': 7,
      'Miazia': 8, 'ሚያዝያ': 8,
      'Ginbot': 9, 'ግንቦት': 9,
      'Sene': 10, 'ሰኔ': 10,
      'Hamle': 11, 'ሐምሌ': 11,
      'Nehase': 12, 'ነሐሴ': 12,
      'Pagume': 13, 'ጳጉሜ': 13
    };
    return monthMap[monthName] || 1;
  }

  private getAmharicMonthName(monthNumber: number): string {
    const amharicMonths = [
      'መስከረም',
      'ጥቅምት',
      'ህዳር',
      'ታህሳስ',
      'ጥር',
      'የካቲት',
      'መጋቢት',
      'ሚያዝያ',
      'ግንቦት',
      'ሰኔ',
      'ሐምሌ',
      'ነሐሴ',
      'ጳጉሜ'
    ];
    return amharicMonths[monthNumber - 1] || 'መስከረም';
  }
}