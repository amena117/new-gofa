import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';
import { Item } from '../../model/item.model';
import { Router } from '@angular/router';
import Kenat from 'kenat';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-listing',
  templateUrl: './listing.component.html',
  styleUrls: ['./listing.component.css']
})
export class ListingComponent implements OnInit, OnDestroy {
  @ViewChild('listingContent', { static: false }) listingContent!: ElementRef;
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
  selectedCategory = ''; // Add category filter
  availableCategories: string[] = []; // Store unique categories
  categoryCounts: Map<string, number> = new Map(); // Store item count per category
  selectedSource = ''; // Add source filter
  availableSources: string[] = []; // Store unique sources
  sourceCounts: Map<string, number> = new Map(); // Store item count per source

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

        // Extract unique categories for filter
        this.extractCategories();
        
        // Extract unique sources for filter
        this.extractSources();

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
          !item.registeredBy.includes(' ') && // Skip full names
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
    // Skip if it looks like a full name (contains space)
    if (!this.pendingUserRequests.has(registeredBy) && !registeredBy.includes(' ')) {
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
    let filtered = [...this.items];

    // Apply search filter - search across multiple fields
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.description?.toLowerCase().includes(searchLower) ||
        item.model?.toLowerCase().includes(searchLower) ||
        item.voucherNumber?.toLowerCase().includes(searchLower) ||
        item.receivedFrom?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(item =>
        item.category === this.selectedCategory
      );
    }

    // Apply source filter
    if (this.selectedSource) {
      filtered = filtered.filter(item =>
        item.source === this.selectedSource
      );
    }

    this.filteredItems = filtered;

    // ✅ Keep filtered results sorted too — newest first
    this.filteredItems.sort((a, b) => this.parseDate(b.registrationDate) - this.parseDate(a.registrationDate));

    this.currentPage = 1;
    this.setPage(1);
    
    // Pre-fetch user details for new visible items
    this.prefetchVisibleUserDetails();
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedCategory || this.selectedSource);
  }

  // Clear all filters
  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedSource = '';
    this.applyFilter();
  }

  // Get active filter count
  getActiveFilterCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedCategory) count++;
    if (this.selectedSource) count++;
    return count;
  }

  // Export filtered items to PDF
  exportToPDF(): void {
  if (!this.listingContent?.nativeElement) return;

  const element = this.listingContent.nativeElement as HTMLElement;

  // ── 1. Expand to all rows ──────────────────────────────────────────
  const originalPage    = this.currentPage;
  const originalPerPage = this.itemsPerPage;
  this.itemsPerPage     = this.filteredItems.length || 1;
  this.setPage(1);

  // ── 2. Hide UI chrome via inline styles (more reliable than classes) 
  const hideSelectors = [
    '.header-actions',
    '.filters-section',
    '.pagination-controls',
    '.action-btn',
    '.filters-header',
    '.search-filter-group',
    '.filter-controls',
    '.filter-group',
    '.clear-filters-btn',
  ];

  const hiddenElements: { el: HTMLElement; prev: string }[] = [];
  hideSelectors.forEach(sel => {
    element.querySelectorAll<HTMLElement>(sel).forEach(el => {
      hiddenElements.push({ el, prev: el.style.display });
      el.style.display = 'none';
    });
  });

  const cleanup = () => {
    this.itemsPerPage = originalPerPage;
    this.setPage(originalPage);
    hiddenElements.forEach(({ el, prev }) => (el.style.display = prev));
  };

  // ── 3. Double rAF ensures Angular has painted the new rows ──────────
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {

        html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: -window.scrollY,
          windowWidth:  element.scrollWidth,
          windowHeight: element.scrollHeight,
          logging: false,
          imageTimeout: 0,
          removeContainer: true,
          onclone: (clonedDoc: Document) => {
            const cloned = clonedDoc.querySelector('.item-listing') as HTMLElement | null;
            if (cloned) {
              cloned.style.maxHeight = 'none';
              cloned.style.overflow  = 'visible';
            }
            // Also hide inside the clone, in case any survived
            hideSelectors.forEach(sel => {
              clonedDoc.querySelectorAll<HTMLElement>(sel).forEach(el => {
                el.style.display = 'none';
              });
            });
          }
        }).then((canvas: HTMLCanvasElement) => {

          const pdf           = new jsPDF('p', 'mm', 'a4');
          const pageW         = pdf.internal.pageSize.getWidth();
          const pageH         = pdf.internal.pageSize.getHeight();
          const margin        = 10;
          const imgW          = pageW - margin * 2;
          const pxPerMm       = canvas.width / imgW;
          const pageContentPx = (pageH - margin * 2) * pxPerMm;
          const totalH        = canvas.height;

          const containerTop = element.getBoundingClientRect().top + window.scrollY;
          const scaleRatio   = canvas.width / element.scrollWidth;

          const safeYs: number[] = [0];
          element.querySelectorAll('tr, h1, h2, h3').forEach((el: Element) => {
            const r     = (el as HTMLElement).getBoundingClientRect();
            const top   = (r.top + window.scrollY - containerTop) * scaleRatio;
            const bot   = top + r.height * scaleRatio;
            safeYs.push(top, bot);
          });
          safeYs.push(totalH);
          safeYs.sort((a, b) => a - b);

          const cuts: number[] = [0];
          let cursor = 0;
          while (cursor < totalH) {
            const naiveCut = cursor + pageContentPx;
            if (naiveCut >= totalH) break;
            let bestCut = naiveCut;
            for (let i = safeYs.length - 1; i >= 0; i--) {
              if (safeYs[i] <= naiveCut && safeYs[i] > cursor) {
                bestCut = safeYs[i];
                break;
              }
            }
            cuts.push(bestCut);
            cursor = bestCut;
          }
          cuts.push(totalH);

          cuts.forEach((cutStart: number, idx: number) => {
            if (idx === cuts.length - 1) return;
            const sliceH  = cuts[idx + 1] - cutStart;
            const sliceMm = sliceH / pxPerMm;

            const sliceCanvas    = document.createElement('canvas');
            sliceCanvas.width    = canvas.width;
            sliceCanvas.height   = Math.ceil(sliceH);
            sliceCanvas.getContext('2d')!.drawImage(
              canvas, 0, cutStart, canvas.width, sliceH,
              0, 0, canvas.width, sliceH
            );

            if (idx > 0) pdf.addPage();
            pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, sliceMm);
          });

          const fileName = this.hasActiveFilters()
            ? `items-filtered-${Date.now()}.pdf`
            : `items-all-${Date.now()}.pdf`;
          pdf.save(fileName);
          cleanup();

        }).catch((err: Error) => {
          console.error('PDF generation error:', err);
          cleanup();
        });

      }, 200); // small extra wait for any CSS transitions
    });
  });
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

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory = select.value;
    this.applyFilter();
  }

  onSourceChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSource = select.value;
    this.applyFilter();
  }

  // Extract unique categories from loaded items
  private extractCategories(): void {
    const categoryMap = new Map<string, number>();
    
    this.items.forEach(item => {
      if (item.category && item.category !== 'Unknown') {
        const count = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, count + 1);
      }
    });
    
    this.categoryCounts = categoryMap;
    this.availableCategories = Array.from(categoryMap.keys()).sort();
    
    console.log('Available categories with counts:', Array.from(categoryMap.entries()));
  }

  // Extract unique sources from loaded items
  private extractSources(): void {
    const sourceMap = new Map<string, number>();
    
    this.items.forEach(item => {
      if (item.source && item.source !== 'Unknown') {
        const count = sourceMap.get(item.source) || 0;
        sourceMap.set(item.source, count + 1);
      }
    });
    
    this.sourceCounts = sourceMap;
    this.availableSources = Array.from(sourceMap.keys()).sort();
    
    console.log('Available sources with counts:', Array.from(sourceMap.entries()));
  }

  // Get item count for a specific category
  getCategoryCount(category: string): number {
    return this.categoryCounts.get(category) || 0;
  }

  // Get item count for a specific source
  getSourceCount(source: string): number {
    return this.sourceCounts.get(source) || 0;
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