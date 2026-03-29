import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService } from '../services/item.service';
import { Model22Service } from '../services/model22.service';
import { AuthService } from '../services/auth.service';
import { Item, TransactionEntry } from '../model/item.model';
import { Model22Dto } from '../model/model22';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-inventory-summary',
  templateUrl: './inventory-summary.component.html',
  styleUrls: ['./inventory-summary.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class InventorySummaryComponent implements OnInit, OnDestroy {
  summaryData: {
    totalItems: number;
    totalQuantity: number;
    totalValueByCurrency: { [currency: string]: number };
    lowStockItems: { itemId: number | undefined; description: string; model: string; quantity: number; isCriticallyLow: boolean; isLow: boolean }[];
    recentWithdrawals: (Model22Dto & { dateFormatted: string })[];
    itemsByCategory: { name: string; count: number }[];
    itemsByWarehouse: { name: string; quantity: number }[];
    monthlyInventoryTrends: { monthYear: string; received: number; withdrawn: number }[];
    topItems: { itemId: number | undefined; description: string; model: string; quantity: number }[];
  } = {
    totalItems: 0,
    totalQuantity: 0,
    totalValueByCurrency: {},
    lowStockItems: [],
    recentWithdrawals: [],
    itemsByCategory: [],
    itemsByWarehouse: [],
    monthlyInventoryTrends: [],
    topItems: []
  };

  // 🔍 Search & Pagination for Categories
  categorySearchTerm = '';
  filteredCategories: { name: string; count: number }[] = [];
  displayedCategories: { name: string; count: number }[] = [];
  showAllCategories = false;
  maxDisplayed = 8; // Show only 8 categories by default

  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private itemService: ItemService,
    private model22Service: Model22Service,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInventorySummary();
  }

  ngOnDestroy(): void {
    // No cleanup needed
  }

  loadInventorySummary(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.categorySearchTerm = ''; // Reset search on reload
    this.showAllCategories = false;

    const userRole = this.authService.getRole()?.toUpperCase();
    if (!userRole) {
      console.warn('No user role found');
      this.errorMessage = 'የለም ወይም ልክ ያልሆነ ሚና። እባክዎ አስተዳዳሪውን ያነጋግሩ።'; // No or invalid role
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // ✅ Fetch items filtered by user role
    this.itemService.getItemsByRole([userRole]).subscribe({
      next: (items) => {
        console.log('InventorySummary: Fetched items:', items);

        // ✅ Fetch withdrawals for user role
        this.model22Service.getModel22s(userRole).subscribe({
          next: (withdrawals) => {
            console.log('InventorySummary: Fetched Model22 withdrawals:', withdrawals);

            // ✅ Fetch all transactions
            this.itemService.getAllTransactionHistories().subscribe({
              next: (transactions) => {
                console.log('InventorySummary: Fetched transactions:', transactions);
                this.processData(items, withdrawals, transactions, userRole);
                this.isLoading = false;
                this.cdr.detectChanges();
              },
              error: (error) => {
                console.error('InventorySummary: Error fetching transactions:', error);
                this.processData(items, withdrawals, [], userRole); // Proceed without transactions
                this.isLoading = false;
                this.cdr.detectChanges();
              }
            });
          },
          error: (error) => {
            console.error('InventorySummary: Error fetching withdrawals:', error);
            this.processData(items, [], [], userRole); // Proceed without withdrawals
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('InventorySummary: Error loading items:', error);
        this.errorMessage = 'የክምችት ማጠቃለያ መጫን አልተሳካም'; // Failed to load inventory summary
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private processData(items: Item[], withdrawals: Model22Dto[], transactions: TransactionEntry[], userRole: string): void {
    // ✅ STRICT ROLE FILTER — Double-check items match user role
    const roleFilteredItems = items.filter(item => item.role?.toUpperCase() === userRole);

    console.log('✅ Role-Filtered Items (strict match):', roleFilteredItems.map(i => ({
      id: i.itemId,
      desc: i.description,
      category: i.category,
      role: i.role,
      warehouse: i.warehouseId,
      qty: i.quantity
    })));

    if (roleFilteredItems.length === 0) {
      this.errorMessage = `ለሚና ${userRole} ምንም እቃዎች አልተገኙም።`; // No items found for role
      this.cdr.detectChanges();
      return;
    }

    // ✅ TOTAL ITEMS & QUANTITY
    this.summaryData.totalItems = roleFilteredItems.length;
    this.summaryData.totalQuantity = roleFilteredItems.reduce((sum, item) => sum + item.quantity, 0);

    // ✅ CALCULATE TOTAL VALUE BY CURRENCY (using average transaction price per currency)
    this.summaryData.totalValueByCurrency = {};
    
    // For each item, calculate value using average price per currency
    roleFilteredItems.forEach(item => {
      // Get all receive transactions for this item
      const receiveTransactions = transactions.filter(t => 
        t.itemId === item.itemId && 
        t.action.toLowerCase().includes('receive') &&
        t.unitPrice != null &&
        t.currency != null &&
        t.currency.toUpperCase() !== 'FOC'
      );
      
      // If no paid transactions found, use item's current price (if not FOC)
      if (receiveTransactions.length === 0) {
        const currency = (item.currency || 'ETB').toUpperCase();
        if (currency === 'FOC') {
          return; // Skip items that have always been FOC
        }
        
        const itemValue = (item.unitPrice || 0) * item.quantity;
        if (!this.summaryData.totalValueByCurrency[currency]) {
          this.summaryData.totalValueByCurrency[currency] = 0;
        }
        this.summaryData.totalValueByCurrency[currency] += itemValue;
        return;
      }
      
      // Calculate total value and quantity received per currency
      const valuesByCurrency = new Map<string, { totalValue: number; totalQty: number }>();
      
      receiveTransactions.forEach(t => {
        const currency = t.currency!.toUpperCase();
        const qty = t.quantity || 0;
        const price = t.unitPrice || 0;
        
        if (!valuesByCurrency.has(currency)) {
          valuesByCurrency.set(currency, { totalValue: 0, totalQty: 0 });
        }
        
        const currencyData = valuesByCurrency.get(currency)!;
        currencyData.totalValue += qty * price;
        currencyData.totalQty += qty;
      });
      
      // Calculate total quantity received across all currencies
      let totalReceivedQty = 0;
      valuesByCurrency.forEach((data) => {
        totalReceivedQty += data.totalQty;
      });
      
      // Calculate current stock value per currency using proportional allocation
      valuesByCurrency.forEach((data, currency) => {
        if (data.totalQty > 0 && totalReceivedQty > 0) {
          // Calculate the proportion of current stock that should be valued in this currency
          const proportionInCurrency = data.totalQty / totalReceivedQty;
          const qtyInCurrency = Math.round(item.quantity * proportionInCurrency);
          
          // Use average price for this currency (total value / total qty)
          const avgPrice = data.totalValue / data.totalQty;
          const stockValue = qtyInCurrency * avgPrice;
          
          if (!this.summaryData.totalValueByCurrency[currency]) {
            this.summaryData.totalValueByCurrency[currency] = 0;
          }
          this.summaryData.totalValueByCurrency[currency] += stockValue;
        }
      });
    });

    // ✅ LOW STOCK ITEMS (quantity < 5)
    this.summaryData.lowStockItems = roleFilteredItems
      .filter(item => item.quantity < 5)
      .map(item => ({
        itemId: item.itemId,
        description: item.description || 'ያልታወቀ',
        model: item.model || 'ያልታወቀ',
        quantity: item.quantity,
        isCriticallyLow: item.quantity < 3,
        isLow: item.quantity >= 3 && item.quantity < 5
      }))
      .slice(0, 10);

    // ✅ RECENT WITHDRAWALS
    this.summaryData.recentWithdrawals = withdrawals
      .slice(-10)
      .reverse()
      .map(withdrawal => ({
        ...withdrawal,
        dateFormatted: this.formatEthiopianDate(withdrawal.ethiopianDate)
      }));

    // ✅ ITEMS BY CATEGORY — ONLY FROM ROLE-FILTERED ITEMS
    const categoryMap = new Map<string, number>();
    roleFilteredItems.forEach(item => {
      const category = item.category || 'ያልተመደበ';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    this.summaryData.itemsByCategory = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 🔍 Initialize filtered & displayed categories
    this.onCategorySearch();

    // ✅ ITEMS BY WAREHOUSE — Show where your items are physically stored
    const warehouseMap = new Map<string, number>();
    roleFilteredItems.forEach(item => {
      const warehouse = item.warehouseId || 'ያልታወቀ';
      warehouseMap.set(warehouse, (warehouseMap.get(warehouse) || 0) + item.quantity);
    });
    this.summaryData.itemsByWarehouse = Array.from(warehouseMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    // ✅ TOP ITEMS (by quantity)
    this.summaryData.topItems = [...roleFilteredItems]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        itemId: item.itemId,
        description: item.description || 'ያልታወቀ',
        model: item.model || 'ያልታወቀ',
        quantity: item.quantity
      }));
  }

  // 🔍 Search handler
  onCategorySearch(event?: any): void {
    if (event) {
      this.categorySearchTerm = event.target.value.toLowerCase();
    }

    this.filteredCategories = this.summaryData.itemsByCategory.filter(cat =>
      cat.name.toLowerCase().includes(this.categorySearchTerm)
    );

    this.updateDisplayedCategories();
  }

  // 📄 Update what's shown (top N or all)
  updateDisplayedCategories(): void {
    if (this.showAllCategories || this.filteredCategories.length <= this.maxDisplayed) {
      this.displayedCategories = this.filteredCategories;
    } else {
      this.displayedCategories = this.filteredCategories.slice(0, this.maxDisplayed);
    }
  }

  // 🔁 Toggle show all
  toggleShowAll(): void {
    this.showAllCategories = !this.showAllCategories;
    this.updateDisplayedCategories();
  }

  // Show "Show More" button only if needed
  shouldShowToggle(): boolean {
    return this.filteredCategories.length > this.maxDisplayed || this.showAllCategories;
  }

  // 🔗 Navigate to item details
  onItemClick(itemId: number | undefined): void {
    if (itemId === undefined) {
      console.error('InventorySummary: Item ID is undefined');
      this.errorMessage = 'የእቃ መለያ ጠፍቷል'; // Item ID is missing
      this.cdr.detectChanges();
      return;
    }
    console.log('InventorySummary: Navigating to item details for itemId:', itemId);
    this.router.navigate(['/item', itemId]);
  }

  // 🔗 Navigate to withdrawal details
  onWithdrawalClick(withdrawal: Model22Dto): void {
    if (withdrawal.model22Id === undefined) {
      console.error('InventorySummary: Withdrawal ID is undefined');
      this.errorMessage = 'የማውጣት መለያ ጠፍቷል'; // Withdrawal ID is missing
      this.cdr.detectChanges();
      return;
    }
    console.log('InventorySummary: Navigating to Model22 details for model22Id:', withdrawal.model22Id);
    this.router.navigate(['/model22-detail', withdrawal.model22Id]);
  }

  // 🔄 Refresh all data
  refreshData(): void {
    this.loadInventorySummary();
  }

  // 💰 Get formatted total value
  getTotalValueFormatted(): string {
    const values: string[] = [];
    
    Object.keys(this.summaryData.totalValueByCurrency).forEach(currency => {
      const value = this.summaryData.totalValueByCurrency[currency];
      if (value > 0) {
        values.push(`${value.toFixed(2)} ${currency}`);
      }
    });
    
    return values.join(' | ') || '0.00 ETB';
  }

  // 📅 Ethiopian Date Formatting
  formatEthiopianDate(date: string | null): string {
    if (!date || date === 'Unknown Date') {
      return 'ያልታወቀ ቀን'; // Unknown Date
    }
    try {
      if (/[\u1200-\u137F]/.test(date)) {
        return date; // Already in Amharic
      }
      const [monthName, day, year] = date.split(/[\s,]+/).filter(part => part);
      const monthNumber = this.getEthiopianMonthNumber(monthName);
      const amharicMonth = this.getAmharicMonthName(monthNumber);
      return `${amharicMonth} ${day}, ${year}`;
    } catch (error) {
      console.error('InventorySummary: Error formatting Ethiopian date:', error);
      return 'ያልታወቀ ቀን';
    }
  }

  private getEthiopianMonthNumber(monthName: string): number {
    const monthMap: { [key: string]: number } = {
      'Meskerem': 1, 'Tikimt': 2, 'Hidar': 3, 'Tahsas': 4, 'Tir': 5,
      'Yekatit': 6, 'Megabit': 7, 'Miazia': 8, 'Ginbot': 9, 'Sene': 10,
      'Hamle': 11, 'Nehase': 12, 'Pagume': 13,
      'መስከረም': 1, 'ጥቅምት': 2, 'ህዳር': 3, 'ታህሳስ': 4, 'ጥር': 5,
      'የካቲት': 6, 'መጋቢት': 7, 'ሚያዝያ': 8, 'ግንቦት': 9, 'ሰኔ': 10,
      'ሐምሌ': 11, 'ነሐሴ': 12, 'ጳጉሜ': 13
    };
    return monthMap[monthName] || 1;
  }

  private getAmharicMonthName(monthNumber: number): string {
    const amharicMonths = [
      'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት',
      'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
    ];
    return amharicMonths[monthNumber - 1] || 'መስከረም';
  }
}