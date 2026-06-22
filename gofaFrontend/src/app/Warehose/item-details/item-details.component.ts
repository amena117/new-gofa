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
import * as XLSX from 'xlsx';

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
  consolidatedAccessories: ConsolidatedAccessory[] = []; // Add consolidated accessories
  showAccessoryModal = false; // Modal visibility
  showSerialNumbers = false;
  serialNumberSearch = '';
  selectedAccessory: ConsolidatedAccessory | null = null; // Selected accessory for modal
  model22Withdrawals: Array<{
    withdrawal: Model22Dto;
    description: string;
    currency: string;
    serialNumbers: string[];
    quantity: number;
    isAccessoryOnly: boolean; // ✅ Added flag for accessory-only withdrawals
    withdrawnAccessories: any[];
    sortableDate: Date;
  }> = [];
  errorMessage: string | null = null;
  debugInfo: string | null = null;
  isLoading = false;
  isWithdrawalsLoading = false;
  isEditing = false;
  isSubmitting = false;

  // New properties for reporting features
  actionFilter: string = 'all'; // 'all', 'received', 'withdrawn'
  filteredTransactions: TransactionEntry[] = [];
  filteredWithdrawals: TransactionEntry[] = [];
  
  // Pagination properties
  accessoryPageSize = 5;
  accessoryCurrentPage = 1;
  receiveHistoryPageSize = 5;
  receiveHistoryCurrentPage = 1;
  withdrawalHistoryPageSize = 5;
  withdrawalHistoryCurrentPage = 1;
  
  // Paginated arrays
  pagedAccessories: ConsolidatedAccessory[] = [];
  pagedReceiveHistory: TransactionEntry[] = [];
  pagedWithdrawalHistory: any[] = [];
  
  // Summary metrics
  totalReceived: number = 0;
  totalWithdrawn: number = 0;
  currentStockValue: number = 0;
  totalTransactions: number = 0;

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
      this.loadDropdownData();

      this.routerSubscription = this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          console.log('ItemDetails: Navigation event detected, refreshing item details');
          this.loadItemDetails(+itemId);
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

        // Consolidate accessories AFTER transactions are processed
        this.consolidateAccessories(item.accessories || []);

        // Chain the withdrawals load AFTER item is successfully loaded to avoid race conditions
        if (item.itemId) {
          this.loadModel22Withdrawals(item.itemId);
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
    // This method is deprecated - use getAccessoryValueByCurrency instead
    const price = unitPrice || 0;
    const curr = currency || 'ETB';
    const totalPrice = price * quantity;
    return `${totalPrice.toFixed(2)} ${curr}`;
  }

  // NEW: Calculate accessory value by currency based on transaction history
  getAccessoryValueByCurrency(accessory: ConsolidatedAccessory): string {
    if (!this.item) {
      return '0.00 ETB';
    }

    // Use currentQuantity if available (after withdrawals loaded), otherwise use totalQuantity
    const quantity = accessory.currentQuantity !== undefined ? accessory.currentQuantity : accessory.totalQuantity;
    
    if (!quantity) {
      return '0.00 ETB';
    }

    // Simple calculation using accessory's own unit price
    const price = accessory.unitPrice || 0;
    const curr = accessory.currency || 'ETB';
    return `${(price * quantity).toFixed(2)} ${curr}`;
  }

  // Calculate total accessories value grouped by currency
  getTotalAccessoriesValue(): string {
    if (!this.consolidatedAccessories || this.consolidatedAccessories.length === 0) {
      return '0.00 ETB';
    }

    const totalsByCurrency = new Map<string, number>();

    this.consolidatedAccessories.forEach(acc => {
      const quantity = acc.currentQuantity !== undefined ? acc.currentQuantity : acc.totalQuantity;
      const price = acc.unitPrice || 0;
      const currency = acc.currency || 'ETB';

      // Skip FOC (Free of Charge)
      if (currency === 'FOC') return;

      const currentTotal = totalsByCurrency.get(currency) || 0;
      totalsByCurrency.set(currency, currentTotal + (price * quantity));
    });

    // Format the output
    if (totalsByCurrency.size === 0) {
      return '0.00 ETB';
    }

    const parts: string[] = [];
    totalsByCurrency.forEach((total, currency) => {
      parts.push(`${total.toFixed(2)} ${currency}`);
    });

    return parts.join(' + ');
  }

  // Consolidate duplicate accessories by name and model
  private consolidateAccessories(accessories: Accessory[]): void {
    const accessoryMap = new Map<string, ConsolidatedAccessory>();

    console.log('=== CONSOLIDATING ACCESSORIES ===');

    const itemRegistrationDate = this.item?.registrationDate || 'Unknown Date';
    const itemRegisteredBy = this.item?.registeredBy || 'Unknown';

    // Parse transaction history to get individual receive events per accessory
    const accessoryTransactions = this.parseAccessoryTransactions();

    accessories.forEach((accessory) => {
      const key = `${accessory.name}_${accessory.model}`;
      const dbQty = accessory.quantity || 0;

      if (accessoryMap.has(key)) {
        // Legacy duplicate DB records — just sum quantities, entries already built
        const existing = accessoryMap.get(key)!;
        existing.totalQuantity += dbQty;
        if (accessory.unitPrice && accessory.unitPrice > 0) {
          existing.unitPrice = accessory.unitPrice;
          existing.currency = accessory.currency || 'ETB';
        }
        if (accessory.subAccessories?.length) {
          existing.subAccessories = existing.subAccessories || [];
          existing.subAccessories.push(...accessory.subAccessories);
        }
      } else {
        // Build allEntries from parsed transaction history for this accessory
        const txEntries = accessoryTransactions
          .filter(t => t.name === accessory.name && t.model === accessory.model)
          .map(t => ({ quantity: t.quantity, date: t.date, registeredBy: t.registeredBy }));

        const allEntries: Array<{ quantity: number; date: string; registeredBy: string }> = [];

        if (txEntries.length > 0) {
          allEntries.push(...txEntries);
        } else {
          // No parsed accessory transactions — build one entry per item receive transaction
          // Each item receive transaction had accessories with the same ratio
          const itemReceiveTxs = this.transactions?.filter(t =>
            t.action?.toLowerCase() === 'receive' &&
            (t.details?.includes('Received From:') || t.details?.includes('Source:'))
          ) || [];

          if (itemReceiveTxs.length > 0) {
            // We have item receive transactions but no accessory-specific ones
            // Show one entry per receive transaction — quantity unknown so show as single combined entry
            allEntries.push({
              quantity: dbQty,
              date: itemReceiveTxs[0].date || itemRegistrationDate,
              registeredBy: itemRegisteredBy
            });
          } else {
            allEntries.push({
              quantity: dbQty,
              date: itemRegistrationDate,
              registeredBy: itemRegisteredBy
            });
          }
        }

        accessoryMap.set(key, {
          id: accessory.id || 0,
          name: accessory.name,
          model: accessory.model,
          totalQuantity: dbQty,
          unitPrice: accessory.unitPrice,
          currency: accessory.currency || 'ETB',
          allEntries,
          totalWithdrawn: 0,
          subAccessories: accessory.subAccessories ? [...accessory.subAccessories] : []
        });
      }

      console.log(`  ${accessory.name} (${accessory.model}): DB qty=${dbQty}`);
    });

    this.consolidatedAccessories = Array.from(accessoryMap.values());
    console.log('=== FINAL CONSOLIDATED ACCESSORIES ===');
    this.consolidatedAccessories.forEach(acc => {
      console.log(`${acc.name} (${acc.model}): totalQuantity=${acc.totalQuantity}, entries=${acc.allEntries.length}`);
    });

    this.updateAccessoryPagination();
  }

  // Parse transaction history to extract accessory additions
  private parseAccessoryTransactions(): Array<{
    name: string;
    model: string;
    quantity: number;
    date: string;
    registeredBy: string;
  }> {
    const accessoryTransactions: Array<{
      name: string;
      model: string;
      quantity: number;
      date: string;
      registeredBy: string;
    }> = [];
    
    if (!this.transactions || this.transactions.length === 0) {
      return accessoryTransactions;
    }
    
    // Look through all receive transactions for accessory additions
    this.transactions.forEach(transaction => {
      if (transaction.history && transaction.history.includes('Accessories added:')) {
        // Parse the history field: "Accessories added: Charger (USB-C) x2, Battery (Li-ion) x3"
        const match = transaction.history.match(/Accessories added:\s*(.+)/);
        if (match) {
          const accessoriesStr = match[1];
          // Split by comma to get individual accessories
          const accessoryParts = accessoriesStr.split(',').map(s => s.trim());
          
          accessoryParts.forEach(part => {
            // Parse each part: "Charger (USB-C) x2"
            const accessoryMatch = part.match(/^(.+?)\s*\((.+?)\)\s*x(\d+)$/);
            if (accessoryMatch) {
              const name = accessoryMatch[1].trim();
              const model = accessoryMatch[2].trim();
              const quantity = parseInt(accessoryMatch[3], 10);
              
              // Extract registeredBy from details
              let registeredBy = 'Unknown';
              if (transaction.details) {
                const registeredByMatch = transaction.details.match(/Registered By:\s*([^,]+)/);
                if (registeredByMatch) {
                  registeredBy = registeredByMatch[1].trim();
                }
              }
              
              accessoryTransactions.push({
                name,
                model,
                quantity,
                date: transaction.date || 'Unknown Date',
                registeredBy
              });
            }
          });
        }
      }
    });
    
    console.log('Parsed accessory transactions:', accessoryTransactions);
    return accessoryTransactions;
  }

  // Open accessory details modal
  openAccessoryModal(accessory: ConsolidatedAccessory): void {
    // Create a fresh copy of the accessory to avoid reference issues
    this.selectedAccessory = { ...accessory };
    this.showAccessoryModal = true;
    
    // Fetch withdrawal history for this accessory from Model22 records
    this.loadAccessoryWithdrawals(this.selectedAccessory);
  }

  // Load withdrawal history for an accessory
  private loadAccessoryWithdrawals(accessory: ConsolidatedAccessory): void {
    if (!this.item) return;
    
    const userRole = this.authService.getRole();
    if (!userRole) return;
    
    // Fetch all Model22 records for this role
    this.model22Service.getModel22s(userRole).subscribe({
      next: (model22s) => {
        const withdrawals: Array<{
          quantity: number;
          date: string;
          voucherNumber: string;
          recipientName: string;
        }> = [];
        
        let totalWithdrawn = 0;
        
        // Search through all Model22 records for this accessory
        model22s.forEach(m22 => {
          m22.items.forEach(item => {
            // Check if this item has withdrawn accessories
            if (item.withdrawnAccessories && item.withdrawnAccessories.length > 0) {
              item.withdrawnAccessories.forEach(wa => {
                // Match by accessory name and model
                if (wa.name === accessory.name && wa.model === accessory.model) {
                  withdrawals.push({
                    quantity: wa.quantity,
                    date: m22.ethiopianDate,
                    voucherNumber: m22.voucherNumber,
                    recipientName: m22.recipientName
                  });
                  totalWithdrawn += wa.quantity;
                }
              });
            }
          });
        });
        
        // Sort withdrawals by date (newest first)
        withdrawals.sort((a, b) => {
          // Simple string comparison for Ethiopian dates
          return b.date.localeCompare(a.date);
        });
        
        // IMPORTANT: The DB quantity is ALREADY reduced by withdrawals
        // So: totalReceived = currentDBQuantity + totalWithdrawn
        let currentDBQuantity = 0;
        if (this.item!.accessories && this.item!.accessories.length > 0) {
          this.item!.accessories.forEach(acc => {
            if (acc.name === accessory.name && acc.model === accessory.model) {
              currentDBQuantity += acc.quantity || 0;
            }
          });
        }
        
        const actualTotalReceived = currentDBQuantity + totalWithdrawn;
        
        console.log(`Accessory ${accessory.name} calculation:`, {
          currentDBQuantity,
          totalWithdrawn,
          actualTotalReceived,
          currentQuantity: currentDBQuantity
        });
        
        // Update the selected accessory with withdrawal data
        if (this.selectedAccessory) {
          this.selectedAccessory.totalQuantity = actualTotalReceived; // Total ever received
          this.selectedAccessory.withdrawals = withdrawals;
          this.selectedAccessory.totalWithdrawn = totalWithdrawn;
          this.selectedAccessory.currentQuantity = currentDBQuantity; // Current quantity in DB

          // Fix fallback receive entries — if only one entry exists and it used dbQty,
          // update it to actualTotalReceived now that we know totalWithdrawn
          if (this.selectedAccessory.allEntries?.length === 1 &&
              this.selectedAccessory.allEntries[0].quantity === currentDBQuantity &&
              totalWithdrawn > 0) {
            this.selectedAccessory.allEntries[0].quantity = actualTotalReceived;
          }

          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error loading accessory withdrawals:', err);
      }
    });
  }

  // Close accessory details modal
  closeAccessoryModal(): void {
    this.showAccessoryModal = false;
    this.selectedAccessory = null;
  }

  toggleSerialNumbers(): void {
    this.showSerialNumbers = !this.showSerialNumbers;
    if (!this.showSerialNumbers) this.serialNumberSearch = '';
  }

  filteredSerialNumbers(): any[] {
    if (!this.item?.serialNumbers) return [];
    if (!this.serialNumberSearch) return this.item.serialNumbers;
    const q = this.serialNumberSearch.toLowerCase();
    return this.item.serialNumbers.filter(s => s.serialNumber.toLowerCase().includes(q));
  }

  // Process and sort transactions by date and time (newest first)
  private processAndSortTransactions(transactions: TransactionEntry[]): void {
    // Filter receive transactions
    this.transactions = transactions
      .filter(transaction => transaction.action?.toLowerCase() === 'receive')
      .map(transaction => {
        const parsed = this.parseTransactionDetails(transaction);
        const isAccessoryOnly = this.isAccessoryOnlyReceiveTransaction(transaction);
        return {
          ...transaction,
          unitPrice: transaction.unitPrice ?? parsed.unitPrice,
          currency: transaction.currency ?? parsed.currency,
          isAccessoryOnly: isAccessoryOnly,
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
    
    // Calculate summary metrics after processing
    this.calculateSummaryMetrics();
  }

  // Check if a receive transaction is accessory-only
  private isAccessoryOnlyReceiveTransaction(transaction: TransactionEntry): boolean {
    // For now, let's be very conservative and only mark transactions as accessory-only
    // if they have very specific indicators that they are subsequent accessory additions
    // rather than initial item registrations
    
    const hasZeroQuantity = (transaction.quantity || 0) === 0;
    const details = transaction.details || '';
    const history = transaction.history || '';
    
    // Look for very specific patterns that indicate this is an accessory addition
    // to an existing item, not an initial registration
    const isSubsequentAddition = details.includes('Added accessories to existing item') ||
                                details.includes('Accessories added to item') ||
                                (details.startsWith('Added accessories.') && 
                                 !details.includes('Registered By:') && 
                                 !details.includes('Source:'));
    
    return hasZeroQuantity && isSubsequentAddition && history.includes('Accessories added:');
  }

  // Format accessory history for better display
  formatAccessoryHistory(transaction: TransactionEntry): string {
    if (!transaction.isAccessoryOnly || !transaction.history) {
      return transaction.history || '-';
    }

    // Parse "Accessories added: Charger (USB-C) x2, Battery (Li-ion) x3" 
    // into "Added: Charger x2, Battery x3"
    const match = transaction.history.match(/Accessories added:\s*(.+)/);
    if (match) {
      const accessoriesStr = match[1];
      // Split by comma and simplify each accessory
      const accessories = accessoriesStr.split(',').map(acc => {
        const accMatch = acc.trim().match(/^(.+?)\s*\([^)]*\)\s*x(\d+)$/);
        if (accMatch) {
          return `${accMatch[1].trim()} x${accMatch[2]}`;
        }
        return acc.trim();
      });
      
      return `Added Accessories: ${accessories.join(', ')}`;
    }
    
    return transaction.history;
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
        
        // Consolidate duplicate accessories
        const consolidatedAccessories = this.consolidateWithdrawnAccessories(itemInWithdrawal?.withdrawnAccessories || []);
        
        return {
          withdrawal,
          description: itemInWithdrawal?.description || withdrawal.description || 'Unknown / ያልታወቀ',
          currency: itemInWithdrawal?.currency || 'N/A',
          serialNumbers: itemInWithdrawal?.serialNumbers || [],
          quantity: itemInWithdrawal?.quantity || 0,
          isAccessoryOnly: itemInWithdrawal?.isAccessoryOnly || false, // ✅ Include accessory-only flag
          withdrawnAccessories: consolidatedAccessories,
          sortableDate: this.parseEthiopianDateWithTime(withdrawal.ethiopianDate || '') || new Date(0)
        };
      })
      // Sort Model22 withdrawals by date (newest first)
      .sort((a, b) => b.sortableDate.getTime() - a.sortableDate.getTime());

    console.log('ItemDetails: Sorted Model22 withdrawals for this item (newest first):', this.model22Withdrawals);

    // Update withdrawal history pagination
    this.updateWithdrawalHistoryPagination();

    // Fetch user details for Model22 withdrawals
    const model22Usernames = this.model22Withdrawals
      .filter(w => w.withdrawal.registeredBy)
      .map(w => w.withdrawal.registeredBy!)
      .filter(username => username && !this.userCache.has(username));

    if (model22Usernames.length > 0) {
      this.fetchUserDetailsBatch(model22Usernames);
    }
  }

  // Consolidate duplicate withdrawn accessories by name and model
  private consolidateWithdrawnAccessories(accessories: any[]): any[] {
    const accessoryMap = new Map<string, any>();
    
    accessories.forEach(acc => {
      const key = `${acc.name}_${acc.model}`;
      
      if (accessoryMap.has(key)) {
        const existing = accessoryMap.get(key);
        existing.quantity += acc.quantity;
      } else {
        accessoryMap.set(key, { ...acc });
      }
    });
    
    return Array.from(accessoryMap.values());
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

    // Filter out usernames that look like full names (contain spaces) or are anonymous
    const usernamesToFetch = Array.from(usernames).filter(username =>
      username && 
      username !== 'Unknown' && 
      username !== 'anonymous' &&
      !username.includes(' ') && // Skip full names
      !this.userCache.has(username) && 
      !this.pendingUserRequests.has(username)
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

    // If username already looks like a full name (contains space), return it directly
    if (username.includes(' ')) {
      return username;
    }

    const userInfo = this.userCache.get(username);
    if (userInfo) {
      const fullName = `${userInfo.firstName} ${userInfo.lastName || ''}`.trim();
      return fullName || username;
    }

    // Skip user lookup if username is anonymous
    if (!this.pendingUserRequests.has(username) && username !== 'anonymous') {
      this.pendingUserRequests.set(username, true);

      console.log('Fetching user info for username:', username);

      this.authService.getUserByUsername(username).pipe(
        catchError(err => {
          console.error(`Failed to fetch user details for username: ${username}`, err);
          this.pendingUserRequests.delete(username);
          // Return the username itself instead of 'Unknown' if lookup fails
          this.userCache.set(username, { firstName: username, lastName: '' });
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
            // Return the username itself instead of 'Unknown' if lookup fails
            this.userCache.set(username, { firstName: username, lastName: '' });
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error in user fetch:', err);
          this.pendingUserRequests.delete(username);
          // Return the username itself instead of 'Unknown' if lookup fails
          this.userCache.set(username, { firstName: username, lastName: '' });
          this.cdr.detectChanges();
        }
      });
    }

    // Return the username itself while loading instead of "Loading..."
    return username;
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

  extractReceivedFrom(details: string | null | undefined): string {
    if (!details) return '-';
    
    // Extract "Received From: XXX" from details string
    const match = details.match(/Received From:\s*([^,]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return '-';
  }

  extractSource(details: string | null | undefined): string {
    if (!details) return '-';
    
    // Extract "Source: XXX" from details string
    const match = details.match(/Source:\s*([^,]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return '-';
  }

  // New property to store currency breakdown
  currencyBreakdown: Map<string, number> = new Map();

  // Calculate summary metrics
  calculateSummaryMetrics(): void {
    this.totalReceived = this.item?.quantity || 0;
    this.totalWithdrawn = this.transactionWithdrawals.reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    // Calculate total value and quantity received per currency
    const valuesByCurrency = new Map<string, { totalValue: number; totalQty: number }>();
    
    this.transactions.forEach(t => {
      const qty = t.quantity || 0;
      const price = t.unitPrice || 0;
      const currency = t.currency || 'ETB';
      
      // Skip FOC transactions
      if (currency === 'FOC') return;
      
      if (!valuesByCurrency.has(currency)) {
        valuesByCurrency.set(currency, { totalValue: 0, totalQty: 0 });
      }
      
      const currencyData = valuesByCurrency.get(currency)!;
      currencyData.totalValue += qty * price;
      currencyData.totalQty += qty;
    });
    
    // Calculate current stock value per currency
    // Formula: For each currency, use the proportion of quantity received in that currency
    let itemValuesByCurrency = new Map<string, number>();
    const currentQty = this.item?.quantity || 0;
    
    // Calculate total quantity received across all currencies
    let totalReceivedQty = 0;
    valuesByCurrency.forEach((data) => {
      totalReceivedQty += data.totalQty;
    });
    
    valuesByCurrency.forEach((data, currency) => {
      if (data.totalQty > 0 && totalReceivedQty > 0) {
        // Calculate the proportion of current stock that should be valued in this currency
        const proportionInCurrency = data.totalQty / totalReceivedQty;
        const qtyInCurrency = Math.round(currentQty * proportionInCurrency);
        
        // Use average price for this currency (total value / total qty)
        const avgPrice = data.totalValue / data.totalQty;
        const stockValue = qtyInCurrency * avgPrice;
        
        itemValuesByCurrency.set(currency, stockValue);
      }
    });
    
    // Add accessories value by currency
    this.consolidatedAccessories.forEach(acc => {
      const accPrice = acc.unitPrice || 0;
      const accQty = acc.totalQuantity || 0;
      const accCurrency = acc.currency || 'ETB';
      
      // Skip FOC accessories
      if (accCurrency === 'FOC') return;
      
      const currentValue = itemValuesByCurrency.get(accCurrency) || 0;
      itemValuesByCurrency.set(accCurrency, currentValue + (accPrice * accQty));
    });
    
    // Store the currency breakdown for display
    this.currencyBreakdown = new Map(itemValuesByCurrency);
    
    // Set default values for backward compatibility
    if (itemValuesByCurrency.size === 0) {
      this.currentStockValue = 0;
      if (this.item) this.item.currency = 'ETB';
    } else if (itemValuesByCurrency.size === 1) {
      // Single currency - simple display
      const [currency, value] = Array.from(itemValuesByCurrency.entries())[0];
      this.currentStockValue = value;
      if (this.item) this.item.currency = currency;
    } else {
      // Multiple currencies - store all values
      const sortedCurrencies = Array.from(itemValuesByCurrency.entries())
        .sort((a, b) => b[1] - a[1]); // Sort by value descending
      
      this.currentStockValue = sortedCurrencies[0][1];
      if (this.item) {
        this.item.currency = sortedCurrencies[0][0];
      }
    }
    
    this.totalTransactions = this.transactions.length + this.transactionWithdrawals.length;
    
    // Apply initial filter
    this.applyActionFilter();
  }

  // Format currency breakdown for display
  getFormattedCurrencyBreakdown(): string {
    if (this.currencyBreakdown.size === 0) {
      return '0.00 ETB';
    }
    
    const parts: string[] = [];
    this.currencyBreakdown.forEach((value, currency) => {
      parts.push(`${value.toFixed(2)} ${currency}`);
    });
    
    return parts.join(' + ');
  }

  // Filter transactions by action type
  applyActionFilter(): void {
    if (this.actionFilter === 'received') {
      this.filteredTransactions = [...this.transactions];
      this.filteredWithdrawals = [];
    } else if (this.actionFilter === 'withdrawn') {
      this.filteredTransactions = [];
      this.filteredWithdrawals = [...this.transactionWithdrawals];
    } else {
      this.filteredTransactions = [...this.transactions];
      this.filteredWithdrawals = [...this.transactionWithdrawals];
    }
    
    // Update pagination after filtering
    this.updateAllPagination();
  }

  // Pagination methods
  updateAllPagination(): void {
    this.updateAccessoryPagination();
    this.updateReceiveHistoryPagination();
    this.updateWithdrawalHistoryPagination();
  }

  updateAccessoryPagination(): void {
    const start = (this.accessoryCurrentPage - 1) * this.accessoryPageSize;
    const end = start + this.accessoryPageSize;
    this.pagedAccessories = this.consolidatedAccessories.slice(start, end);
  }

  updateReceiveHistoryPagination(): void {
    const start = (this.receiveHistoryCurrentPage - 1) * this.receiveHistoryPageSize;
    const end = start + this.receiveHistoryPageSize;
    this.pagedReceiveHistory = this.filteredTransactions.slice(start, end);
  }

  updateWithdrawalHistoryPagination(): void {
    const start = (this.withdrawalHistoryCurrentPage - 1) * this.withdrawalHistoryPageSize;
    const end = start + this.withdrawalHistoryPageSize;
    this.pagedWithdrawalHistory = this.model22Withdrawals.slice(start, end);
  }

  // Accessory pagination
  getAccessoryTotalPages(): number {
    return Math.ceil(this.consolidatedAccessories.length / this.accessoryPageSize);
  }

  accessoryPreviousPage(): void {
    if (this.accessoryCurrentPage > 1) {
      this.accessoryCurrentPage--;
      this.updateAccessoryPagination();
    }
  }

  accessoryNextPage(): void {
    if (this.accessoryCurrentPage < this.getAccessoryTotalPages()) {
      this.accessoryCurrentPage++;
      this.updateAccessoryPagination();
    }
  }

  // Receive history pagination
  getReceiveHistoryTotalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.receiveHistoryPageSize);
  }

  receiveHistoryPreviousPage(): void {
    if (this.receiveHistoryCurrentPage > 1) {
      this.receiveHistoryCurrentPage--;
      this.updateReceiveHistoryPagination();
    }
  }

  receiveHistoryNextPage(): void {
    if (this.receiveHistoryCurrentPage < this.getReceiveHistoryTotalPages()) {
      this.receiveHistoryCurrentPage++;
      this.updateReceiveHistoryPagination();
    }
  }

  // Withdrawal history pagination
  getWithdrawalHistoryTotalPages(): number {
    return Math.ceil(this.model22Withdrawals.length / this.withdrawalHistoryPageSize);
  }

  withdrawalHistoryPreviousPage(): void {
    if (this.withdrawalHistoryCurrentPage > 1) {
      this.withdrawalHistoryCurrentPage--;
      this.updateWithdrawalHistoryPagination();
    }
  }

  withdrawalHistoryNextPage(): void {
    if (this.withdrawalHistoryCurrentPage < this.getWithdrawalHistoryTotalPages()) {
      this.withdrawalHistoryCurrentPage++;
      this.updateWithdrawalHistoryPagination();
    }
  }

  // Export to Excel (CSV format)
  exportToExcel(): void {
    if (!this.item) return;

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Item Summary ─────────────────────────────────────────
    const summaryRows = [
      ['Item Details Report / የእቃ ዝርዝር ሪፖርት'],
      [],
      ['Item / እቃ',          this.item.description],
      ['Model / ሞዴል',        this.item.model],
      ['Category / ምድብ',     this.item.category],
      ['Quantity / ብዛት',     this.item.quantity],
      ['Unit Price / ነጠላ ዋጋ', `${this.item.unitPrice ?? 0} ${this.item.currency}`],
      [],
      ['Summary / ማጠቃለያ'],
      ['Current Stock / የአሁኑ ክምችት',       this.totalReceived],
      ['Total Withdrawn / ጠቅላላ የወጣ',      this.totalWithdrawn],
      ['Current Stock Value / የክምችት ዋጋ',  `${this.currentStockValue.toFixed(2)} ${this.item.currency}`],
      ['Total Transactions / ጠቅላላ ግብይቶች', this.totalTransactions],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 36 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── Sheet 2: Received Transactions ───────────────────────────────
    if (this.filteredTransactions.length > 0) {
      const headers = [
        'Date / ቀን',
        'Action / ተግባር',
        'Quantity / ብዛት',
        'Received From / ከማን',
        'Voucher No. / ሰነድ ቁጥር',
        'Unit Price / ነጠላ ዋጋ',
        'Total Price / ጠቅላላ ዋጋ',
        'History / ታሪክ',
        'Details / ዝርዝሮች',
      ];
      const rows = this.filteredTransactions.map(t => [
        this.formatEthiopianDate(t.date),
        t.action || '',
        t.quantity || 0,
        this.extractReceivedFrom(t.details),
        t.voucherNumber || '',
        `${t.unitPrice || 0} ${t.currency || 'ETB'}`,
        this.formatPrice(t.unitPrice || 0, t.currency || 'ETB', t.quantity || 1),
        t.history || '',
        t.details || '',
      ]);
      const wsReceived = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      wsReceived['!cols'] = headers.map(() => ({ wch: 24 }));
      XLSX.utils.book_append_sheet(wb, wsReceived, 'Received');
    }

    // ── Sheet 3: Withdrawal Transactions ─────────────────────────────
    if (this.model22Withdrawals.length > 0) {
      const headers = [
        'Date / ቀን',
        'Quantity / ብዛት',
        'Voucher No. / ሰነድ ቁጥር',
        'Recipient / ተቀባይ',
        'Organization / ድርጅት',
        'Serial Numbers / ተከታታይ ቁጥሮች',
      ];
      const rows = this.model22Withdrawals.map(e => [
        this.formatEthiopianDate(e.withdrawal.ethiopianDate),
        e.quantity,
        e.withdrawal.voucherNumber || '',
        e.withdrawal.recipientName || '',
        e.withdrawal.recipientOrganization || '',
        e.serialNumbers.join(', '),
      ]);
      const wsWithdrawals = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      wsWithdrawals['!cols'] = headers.map(() => ({ wch: 24 }));
      XLSX.utils.book_append_sheet(wb, wsWithdrawals, 'Withdrawals');
    }

    // ── Sheet 4: Accessories ──────────────────────────────────────────
    if (this.consolidatedAccessories.length > 0) {
      const headers = [
        'Name / ስም',
        'Model / ሞዴል',
        'Total Qty / ጠቅላላ ብዛት',
        'Unit Price / ነጠላ ዋጋ',
        'Currency / ምንዛሬ',
        'Total Value / ጠቅላላ ዋጋ',
      ];
      const rows = this.consolidatedAccessories.map(a => [
        a.name,
        a.model,
        a.totalQuantity,
        a.unitPrice ?? 0,
        a.currency,
        `${((a.unitPrice ?? 0) * a.totalQuantity).toFixed(2)} ${a.currency}`,
      ]);
      const wsAcc = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      wsAcc['!cols'] = headers.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, wsAcc, 'Accessories');
    }

    XLSX.writeFile(wb, `item_${this.item.itemId}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // Get transaction color class
  getTransactionColorClass(action: string): string {
    return action?.toLowerCase() === 'receive' ? 'transaction-received' : 'transaction-withdrawn';
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

  if (!this.itemDetails?.nativeElement) {
    console.error('Item details element not available for PDF generation');
    this.errorMessage = 'Failed to generate PDF / PDF መፍጠር አልተሳካም';
    return;
  }

  const element = this.itemDetails.nativeElement as HTMLElement;

  // ── 1. Hide UI chrome ──────────────────────────────────────────────
  document.body.classList.add('print-mode');
  const buttonGroup = element.querySelector('.button-group');
  const editButtons = element.querySelectorAll('.edit-buttons');
  const paginationControls = element.querySelectorAll('.pagination');
  const exportSection = element.querySelector('.export-section');

  buttonGroup?.classList.add('hide-for-pdf');
  editButtons.forEach((el: Element) => el.classList.add('hide-for-pdf'));
  paginationControls.forEach((el: Element) => el.classList.add('hide-for-pdf'));
  exportSection?.classList.add('hide-for-pdf');

  const cleanup = () => {
    document.body.classList.remove('print-mode');
    buttonGroup?.classList.remove('hide-for-pdf');
    editButtons.forEach((el: Element) => el.classList.remove('hide-for-pdf'));
    paginationControls.forEach((el: Element) => el.classList.remove('hide-for-pdf'));
    exportSection?.classList.remove('hide-for-pdf');
  };

  // ── 2. Let Angular re-paint after hiding UI chrome ─────────────────
  setTimeout(() => {
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      logging: false,
      imageTimeout: 0,
      removeContainer: true,
      onclone: (clonedDoc: Document) => {
        const cloned = clonedDoc.querySelector('.item-details') as HTMLElement | null;
        if (cloned) {
          cloned.style.maxHeight = 'none';
          cloned.style.overflow = 'visible';
        }
      }
    }).then((canvas: HTMLCanvasElement) => {

      // ── 3. PDF page geometry ─────────────────────────────────────────
      const pdf       = new jsPDF('p', 'mm', 'a4');
      const pageW     = pdf.internal.pageSize.getWidth();    // 210 mm
      const pageH     = pdf.internal.pageSize.getHeight();   // 297 mm
      const margin    = 10;                                  // mm
      const imgW      = pageW - margin * 2;
      // How many canvas px fit in one content-height page?
      // canvas.width covers (element.scrollWidth * scale) px → imgW mm
      const pxPerMm   = canvas.width / imgW;
      const pageContentPx = (pageH - margin * 2) * pxPerMm; // canvas px per page

      const totalH    = canvas.height;                       // total canvas px

      // ── 4. Collect "safe cut" Y positions from the live DOM ──────────
      //    Query every element that should NOT be split across pages.
      //    We record the bottom edge of each such element so we can
      //    find the nearest safe gap ABOVE a naïve page boundary.
      const elementRect = element.getBoundingClientRect();
      const scrollTop   = window.scrollY || document.documentElement.scrollTop;
      // Absolute top of our container in the document
      const containerTop = elementRect.top + scrollTop;
      const scaleRatio   = canvas.width / element.scrollWidth; // = html2canvas scale

      // Selectors for things that must not be bisected
      const noSplitSelectors = [
        'tr',                 // every table row
        '.form-section',      // each info/table card
        '.summary-card',      // the 4 summary cards
        '.modal-content',     // modal (unlikely but safe)
        'h2.section-title',   // section headings
        'h1.title',
      ].join(',');

      // Build a sorted list of safe-cut Y values (canvas px).
      // A "safe cut" is the GAP between two consecutive block elements —
      // i.e. we cut just BELOW the bottom of an element.
      const safeYs: number[] = [0]; // page 0 always starts at 0

      element.querySelectorAll(noSplitSelectors).forEach((el: Element) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        // Position relative to the container, converted to canvas px
        const topPx    = (r.top + scrollTop - containerTop) * scaleRatio;
        const bottomPx = topPx + r.height * scaleRatio;
        // Record both edges so we can cut either just above or just below
        safeYs.push(topPx, bottomPx);
      });

      safeYs.push(totalH); // sentinel: end of document
      safeYs.sort((a, b) => a - b);

      // ── 5. Determine actual page cut points ───────────────────────────
      //    Starting from Y=0, advance by pageContentPx, then walk
      //    backwards through safeYs to find the nearest cut that
      //    doesn't bisect any element.
      const cuts: number[] = [0];
      let cursor = 0;

      while (cursor < totalH) {
        const naiveCut = cursor + pageContentPx;
        if (naiveCut >= totalH) break; // last page — no cut needed

        // Find the largest safe Y that is ≤ naiveCut
        // (walk backward through the sorted array)
        let bestCut = cursor + 1; // fallback: advance at least 1 px
        for (let i = safeYs.length - 1; i >= 0; i--) {
          if (safeYs[i] <= naiveCut && safeYs[i] > cursor) {
            bestCut = safeYs[i];
            break;
          }
        }

        // Safety valve: if no safe Y was found inside the page window
        // (e.g. a single element taller than one page), just cut naively
        if (bestCut <= cursor) {
          bestCut = naiveCut;
        }

        cuts.push(bestCut);
        cursor = bestCut;
      }

      cuts.push(totalH); // end sentinel

      // ── 6. Render each slice onto its own PDF page ────────────────────
      const imgW_canvas = canvas.width;

      cuts.forEach((cutStart: number, idx: number) => {
        if (idx === cuts.length - 1) return; // skip sentinel
        const cutEnd   = cuts[idx + 1];
        const sliceH   = cutEnd - cutStart;                // canvas px
        const sliceMm  = sliceH / pxPerMm;                 // mm on page

        // Create an off-screen canvas for this slice
        const sliceCanvas  = document.createElement('canvas');
        sliceCanvas.width  = imgW_canvas;
        sliceCanvas.height = Math.ceil(sliceH);
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(
          canvas,
          0, cutStart,              // source x, y
          imgW_canvas, sliceH,      // source w, h
          0, 0,                     // dest x, y
          imgW_canvas, sliceH       // dest w, h
        );

        if (idx > 0) pdf.addPage();
        pdf.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG',
          margin, margin,           // x, y on PDF page
          imgW,   sliceMm           // w, h in mm
        );
      });

      pdf.save(`item-details-${this.item?.itemId || 'unknown'}.pdf`);
      cleanup();

    }).catch((error: Error) => {
      console.error('Error generating PDF:', error);
      this.errorMessage = 'Failed to generate PDF / PDF መፍጠር አልተሳካም';
      cleanup();
    });
  }, 500);
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


// Interface for consolidated accessories
interface ConsolidatedAccessory {
  id: number;
  name: string;
  model: string;
  totalQuantity: number;
  unitPrice?: number;
  currency: string;
  allEntries: Array<{
    quantity: number;
    date: string;
    registeredBy: string;
  }>;
  withdrawals?: Array<{
    quantity: number;
    date: string;
    voucherNumber: string;
    recipientName: string;
  }>;
  totalWithdrawn?: number;
  currentQuantity?: number;
  subAccessories?: Array<{
    id?: number;
    name: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }>;
}
