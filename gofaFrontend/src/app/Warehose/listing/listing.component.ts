import { Component, OnInit, OnDestroy } from '@angular/core';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';
import { Item } from '../../model/item.model';
import { Router } from '@angular/router';
import Kenat from 'kenat';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-listing',
  templateUrl: './listing.component.html',
  styleUrls: ['./listing.component.css']
})
export class ListingComponent implements OnInit, OnDestroy {
  Math = Math;
  items: Item[] = [];
  filteredItems: Item[] = [];
  paginatedItems: Item[] = [];
  errorMessage: string | null = null;
  isLoading = false;
  currentPage = 1;
  itemsPerPage = 10;
  selectedRoles: string[] = [];
  availableRoles = ['VHF', 'HF', 'Electronics', 'Sparepart'];
  dropdownOpen = false;
  searchTerm = '';

  // User cache for registeredBy names
  private userCache: Map<string, string> = new Map();
  private pendingUserRequests: Map<string, boolean> = new Map();
  private dateCache: Map<string, number> = new Map();
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const shouldRefresh = navigation?.extras?.state?.['refresh'];

    if (shouldRefresh) {
      console.log('ListingComponent: Refreshing items after add operation...');
    }

    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.applyFilter();
    });

    this.loadItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }

  isSupplyAndDistributionLeader(): boolean {
    return this.authService.getRole() === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER';
  }

  getUserRole(): string {
    return this.authService.getRole() || 'SPAREPART';
  }

  loadItems(): void {
    console.log('✅ ListingComponent.loadItems() CALLED');
    this.isLoading = true;
    this.errorMessage = null;

    // Clear caches on reload
    this.dateCache.clear();

    let requestObservable;

    if (this.isSupplyAndDistributionLeader()) {
      const rolesToFetch = this.selectedRoles.length > 0 ? this.selectedRoles : this.availableRoles;
      console.log('👨‍💼 Supply Leader - Fetching roles:', rolesToFetch);
      requestObservable = this.itemService.getItemsByRole(rolesToFetch);
    } else {
      const warehouseId = this.getUserRole();
      const rolesToFetch = [warehouseId];
      console.log('👤 Regular User - Fetching by warehouse:', warehouseId);
      requestObservable = this.itemService.getItemsByRole(rolesToFetch);
    }

    requestObservable.subscribe({
      next: (items) => {
        console.log('✅ Backend returned items:', items);
        console.log('✅ Item count:', items.length);

        // Optimized item processing - only essential fields
        this.items = this.processItemsForDisplay(items);

        // 👇 SORT BY ETHIOPIAN DATE — NEWEST FIRST
        this.items.sort((a, b) => this.parseDate(b.registrationDate) - this.parseDate(a.registrationDate));

        // 🧪 DEBUG: Log registeredBy values
        console.log('✅ RegisteredBy values in items:');
        this.items.forEach((item, index) => {
          console.log(`#${index + 1}: Item ID: ${item.itemId}, RegisteredBy: ${item.registeredBy}`);
        });

        // Pre-fetch user details only for first page items (lazy load)
        this.prefetchVisibleUserDetails();

        this.applyFilter(); // Apply search and reset pagination
        this.isLoading = false;

        console.log('✅ Final this.items (sorted):', this.items);
        console.log('✅ Final this.filteredItems:', this.filteredItems);
        console.log('✅ Final this.paginatedItems:', this.paginatedItems);
      },
      error: (err) => {
        console.error('❌ Error loading items:', err);
        this.errorMessage = err.message?.includes('Warehouse')
          ? `No warehouse found for role ${this.getUserRole()}. Please contact an administrator.`
          : `Failed to load items: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  // Optimized item processing - only essential fields for listing
  private processItemsForDisplay(items: Item[]): Item[] {
    return items.map(item => ({
      ...item,
      description: item.description || 'Unknown',
      category: typeof item.category === 'object'
        ? (item.category as any)?.name ?? 'Unknown'
        : item.category ?? 'Unknown',
      registrationDate: item.registrationDate || 'Unknown Date',
      unitPrice: item.unitPrice ?? 0,
      currency: item.currency ?? 'ETB',
      // Only include essential arrays, limit size if needed
      serialNumbers: item.serialNumbers?.slice(0, 5) ?? [], // Limit for performance
      accessories: item.accessories?.slice(0, 5) || [],
      units: item.units?.slice(0, 5) || [],
      // Exclude heavy data not needed for listing
      // transactionHistory: [] // Don't load history in listing
    }));
  }

  // Pre-fetch user details only for visible items (first page + buffer)
  private prefetchVisibleUserDetails(): void {
    const itemsToPrefetch = this.items.slice(0, this.itemsPerPage + 5); // First page + buffer
    
    itemsToPrefetch.forEach(item => {
      if (item.registeredBy && 
          item.registeredBy !== 'Unknown' && 
          item.registeredBy !== 'anonymous' &&
          !this.userCache.has(item.registeredBy) &&
          !this.pendingUserRequests.has(item.registeredBy)) {
        this.fetchUserDetails(item.registeredBy);
      }
    });
  }

  // Fetch user details for a specific username
  private fetchUserDetails(username: string): void {
    this.pendingUserRequests.set(username, true);
    
    this.authService.getUserByUsername(username).subscribe({
      next: (userInfo) => {
        this.pendingUserRequests.delete(username);
        
        if (userInfo && userInfo.firstName) {
          const fullName = `${userInfo.firstName} ${userInfo.lastName || ''}`.trim();
          this.userCache.set(username, fullName || username);
          console.log(`✅ Fetched user details for ${username}: ${fullName}`);
        } else {
          this.userCache.set(username, username); // Fallback to username
          console.log(`❌ No user details found for ${username}, using username`);
        }
      },
      error: (err) => {
        this.pendingUserRequests.delete(username);
        this.userCache.set(username, username); // Fallback to username on error
        console.error(`❌ Error fetching user details for ${username}:`, err);
      }
    });
  }

  // Get display name for registeredBy field with lazy loading
  getRegisteredByDisplay(registeredBy: string | null | undefined): string {
    if (!registeredBy || registeredBy === 'Unknown' || registeredBy === 'anonymous') {
      return 'Unknown / ያልታወቀ';
    }

    // Check cache first
    if (this.userCache.has(registeredBy)) {
      return this.userCache.get(registeredBy)!;
    }

    // If not in cache and not pending, fetch it (lazy loading)
    if (!this.pendingUserRequests.has(registeredBy)) {
      this.fetchUserDetails(registeredBy);
    }

    return registeredBy; // Return username immediately while loading
  }

  // 👇 OPTIMIZED: Parse Amharic Ethiopian dates with caching
  parseDate(dateStr: string | null): number {
    if (!dateStr || dateStr === 'Unknown Date') return 0;

    // Check cache first
    if (this.dateCache.has(dateStr)) {
      return this.dateCache.get(dateStr)!;
    }

    // Try parsing as standard JS Date first
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
      this.dateCache.set(dateStr, jsDate.getTime());
      return jsDate.getTime();
    }

    // 👉 SUPPORT AMHARIC MONTH NAMES — match Ethiopic script: መስከረም, ነሐሴ, etc.
    const ethiopicMatch = dateStr.match(/^([\u1200-\u137F]+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (ethiopicMatch) {
      const [, monthName, day, year] = ethiopicMatch;
      const monthNumber = this.getEthiopianMonthNumber(monthName) - 1; // JS months are 0-indexed
      const gregorianYear = parseInt(year) + 8; // Ethiopian year + 8 ≈ Gregorian year
      const parsedDate = new Date(gregorianYear, monthNumber, parseInt(day));

      if (!isNaN(parsedDate.getTime())) {
        this.dateCache.set(dateStr, parsedDate.getTime());
        return parsedDate.getTime();
      }
    }

    console.warn('⚠️ Could not parse date:', dateStr);
    this.dateCache.set(dateStr, 0);
    return 0;
  }

  // 👇 FIXED: Map both Latin and Amharic month names
  private getEthiopianMonthNumber(monthName: string): number {
    const monthMap: { [key: string]: number } = {
      // Latin names (fallback)
      'Meskerem': 1, 'Tikimt': 2, 'Hidar': 3, 'Tahsas': 4, 'Tir': 5, 'Yekatit': 6,
      'Megabit': 7, 'Miazia': 8, 'Ginbot': 9, 'Sene': 10, 'Hamle': 11, 'Nehase': 12, 'Pagume': 13,
      // ✅ Amharic names — used in your actual data
      'መስከረም': 1, 'ጥቅምት': 2, 'ህዳር': 3, 'ታህሳስ': 4, 'ጥር': 5, 'የካቲት': 6,
      'መጋቢት': 7, 'ሚያዝያ': 8, 'ግንቦት': 9, 'ሰኔ': 10, 'ሐምሌ': 11, 'ነሐሴ': 12, 'ጳጐሜ': 13
    };
    return monthMap[monthName] || 1;
  }

  formatEthiopianDate(date: string | null): string {
    if (!date || date === 'Unknown Date') {
      return 'ያልታወቀ ቀን';
    }
    try {
      if (/[\u1200-\u137F]/.test(date)) {
        return date;
      }

      let kenatDate: Kenat;
      if (date.includes(',')) {
        const [monthName, day, year] = date.split(/[\s,]+/).filter(part => part);
        const monthNumber = this.getEthiopianMonthNumber(monthName);
        kenatDate = new Kenat({ year: parseInt(year), month: monthNumber, day: parseInt(day) });
      } else {
        kenatDate = new Kenat(new Date(date));
      }
      return kenatDate.format({ lang: 'amharic' });
    } catch (error) {
      console.error('Error formatting Ethiopian date:', error);
      return 'ያልታወቀ ቀን';
    }
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value.trim().toLowerCase());
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredItems = [...this.items]; // Simple copy if no search
    } else {
      this.filteredItems = this.items.filter(item =>
        item.description.toLowerCase().includes(this.searchTerm)
      );
    }

    // ✅ Keep filtered results sorted too — newest first
    this.filteredItems.sort((a, b) => this.parseDate(b.registrationDate) - this.parseDate(a.registrationDate));

    this.currentPage = 1;
    this.setPage(1);
    
    // Pre-fetch user details for new visible items
    this.prefetchVisibleUserDetails();
  }

  setPage(page: number): void {
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedItems = this.filteredItems.slice(startIndex, endIndex);
    
    // Pre-fetch user details for newly visible items when page changes
    this.prefetchVisibleUserDetails();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.setPage(page);
    }
  }

  onItemsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.itemsPerPage = Number(select.value);
    this.setPage(1);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.itemsPerPage);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  onRoleCheckboxChange(event: Event, role: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.selectedRoles.includes(role)) {
        this.selectedRoles.push(role);
      }
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
    this.loadItems();
  }

  viewItemDetails(itemId: number): void {
    this.router.navigate(['/item', itemId]).then(success => {
      console.log('Navigation success:', success);
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  navigateToRegister(): void {
    this.router.navigate(['/register-item']);
  }

  // Optimized trackBy function for ngFor
  trackByItemId(index: number, item: Item): number {
    return item.itemId || index;
  }

  // Debug method to check user cache
  // debugUserCache(): void {
  //   console.log('=== USER CACHE DEBUG ===');
  //   console.log('User Cache:', this.userCache);
  //   console.log('Pending Requests:', this.pendingUserRequests);
  //   console.log('Date Cache Size:', this.dateCache.size);
  //   console.log('Items with registeredBy:');
  //   this.items.slice(0, 5).forEach(item => {
  //     console.log(`Item ${item.itemId}: registeredBy="${item.registeredBy}", display="${this.getRegisteredByDisplay(item.registeredBy)}"`);
  //   });
  //   console.log('=== END DEBUG ===');
  // }
}