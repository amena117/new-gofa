import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { AuthService } from '../services/auth.service';
import { Model22Service } from '../services/model22.service';
import { forkJoin } from 'rxjs';

interface UserPerformance {
  username: string;
  fullName: string;
  store: string;
  itemsRegistered: number;
  itemsWithdrawn: number;
  totalTransactions: number;
  lastActivity: string;
  activityScore: number;
  registrationPercentage: number;
  withdrawalPercentage: number;
}

interface StorePerformance {
  store: string;
  totalUsers: number;
  activeUsers: number;
  totalRegistrations: number;
  totalWithdrawals: number;
  topUser: string;
}

@Component({
  selector: 'app-user-performance',
  templateUrl: './user-performance.component.html',
  styleUrls: ['./user-performance.component.css']
})
export class UserPerformanceComponent implements OnInit {
  userPerformances: UserPerformance[] = [];
  storePerformances: StorePerformance[] = [];
  filteredPerformances: UserPerformance[] = [];
  
  isLoading = false;
  errorMessage: string | null = null;
  
  // Filters
  selectedStore = '';
  availableStores = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  searchQuery = '';
  sortBy: 'registrations' | 'withdrawals' | 'total' | 'name' = 'total';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  paginatedPerformances: UserPerformance[] = [];
  
  // Date filter
  selectedPeriod = '';
  periodOptions = [
    { value: '', label: 'All Time / ሁሉም ጊዜ' },
    { value: '1week', label: 'Last Week / ባለፈው ሳምንት' },
    { value: '1month', label: 'Last Month / ባለፈው ወር' },
    { value: '3months', label: 'Last 3 Months / ባለፉት 3 ወራት' },
    { value: '6months', label: 'Last 6 Months / ባለፉት 6 ወራት' },
    { value: '1year', label: 'Last Year / ባለፈው ዓመት' }
  ];

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private model22Service: Model22Service
  ) {}

  ngOnInit(): void {
    this.loadPerformanceData();
  }

  loadPerformanceData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Load both items and Model22 data
    forkJoin({
      items: this.itemService.getItemsByRole(this.availableStores),
      model22s: this.model22Service.getModel22sByRoles(this.availableStores)
    }).subscribe({
      next: ({ items, model22s }) => {
        this.processPerformanceData(items, model22s);
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading performance data:', err);
        this.errorMessage = 'Failed to load performance data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private processPerformanceData(items: any[], model22s: any[]): void {
    const userActivity = new Map<string, { registrations: number; withdrawals: number; store: string }>();
    const storeMap = new Map<string, StorePerformance>();

    // Initialize store performances
    this.availableStores.forEach(store => {
      storeMap.set(store, {
        store,
        totalUsers: 0,
        activeUsers: 0,
        totalRegistrations: 0,
        totalWithdrawals: 0,
        topUser: ''
      });
    });

    // Process items (registrations) - determine user's primary store
    items.forEach(item => {
      const username = item.registeredBy || 'Unknown';
      const store = this.getItemStore(item);
      
      if (!store || !this.availableStores.includes(store)) return;

      // Initialize user activity
      if (!userActivity.has(username)) {
        userActivity.set(username, { registrations: 0, withdrawals: 0, store });
      }
      
      userActivity.get(username)!.registrations++;
      
      // Update store performance
      const storePerf = storeMap.get(store)!;
      storePerf.totalRegistrations++;
    });

    // Process Model22 data (withdrawals) - only count in user's primary store
    model22s.forEach(model22 => {
      const store = model22.role || '';
      const username = model22.registeredBy || 'Unknown';
      
      if (!store || !this.availableStores.includes(store)) return;

      // Only count withdrawals if user exists and this is their store
      if (userActivity.has(username) && userActivity.get(username)!.store === store) {
        const itemsCount = model22.items?.length || 0;
        userActivity.get(username)!.withdrawals += itemsCount;
      }
      
      // Update store performance
      const storePerf = storeMap.get(store);
      if (storePerf) {
        storePerf.totalWithdrawals += (model22.items?.length || 0);
      }
    });

    // Create user performance records - one per user
    const userPerformances: UserPerformance[] = [];
    
    userActivity.forEach((activity, username) => {
      const store = activity.store;
      const storePerf = storeMap.get(store)!;
      
      const registrationPercentage = storePerf.totalRegistrations > 0
        ? (activity.registrations / storePerf.totalRegistrations) * 100
        : 0;
      
      const withdrawalPercentage = storePerf.totalWithdrawals > 0
        ? (activity.withdrawals / storePerf.totalWithdrawals) * 100
        : 0;
      
      userPerformances.push({
        username,
        fullName: this.getFullName(username),
        store,
        itemsRegistered: activity.registrations,
        itemsWithdrawn: activity.withdrawals,
        totalTransactions: activity.registrations + activity.withdrawals,
        lastActivity: '',
        activityScore: (activity.registrations * 2) + activity.withdrawals,
        registrationPercentage,
        withdrawalPercentage
      });
    });

    // Finalize store performances
    storeMap.forEach((storePerf, store) => {
      const storeUsers = userPerformances.filter(u => u.store === store);
      storePerf.totalUsers = storeUsers.length;
      storePerf.activeUsers = storeUsers.filter(u => u.totalTransactions > 0).length;
      
      // Find top user
      if (storeUsers.length > 0) {
        const topUser = storeUsers.reduce((prev, curr) => 
          curr.activityScore > prev.activityScore ? curr : prev
        );
        storePerf.topUser = topUser.fullName || topUser.username;
      }
    });

    this.userPerformances = userPerformances;
    this.storePerformances = Array.from(storeMap.values());
  }

  private getItemStore(item: any): string {
    // Try to get store from item properties
    return item.warehouse || item.store || item.role || '';
  }

  private getFullName(username: string): string {
    // This would ideally fetch from a user service
    // For now, return username
    return username;
  }

  private isMoreRecent(date1: string, date2: string): boolean {
    if (!date1) return false;
    if (!date2) return true;
    return new Date(date1) > new Date(date2);
  }

  applyFilters(): void {
    let filtered = [...this.userPerformances];

    // Store filter
    if (this.selectedStore) {
      filtered = filtered.filter(u => u.store === this.selectedStore);
    }

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(query) ||
        u.fullName.toLowerCase().includes(query) ||
        u.store.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (this.sortBy) {
        case 'registrations':
          comparison = a.itemsRegistered - b.itemsRegistered;
          break;
        case 'withdrawals':
          comparison = a.itemsWithdrawn - b.itemsWithdrawn;
          break;
        case 'total':
          comparison = a.activityScore - b.activityScore;
          break;
        case 'name':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredPerformances = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedPerformances = this.filteredPerformances.slice(start, end);
  }

  onStoreChange(): void {
    this.applyFilters();
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFilters();
  }

  onSortChange(column: 'registrations' | 'withdrawals' | 'total' | 'name'): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onItemsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.itemsPerPage = Number(select.value);
    this.currentPage = 1;
    this.updatePagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPerformances.length / this.itemsPerPage);
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  }

  clearFilters(): void {
    this.selectedStore = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  exportToCSV(): void {
    const headers = ['Username', 'Full Name', 'Store', 'Items Registered', 'Items Withdrawn', 'Total Transactions', 'Activity Score', 'Last Activity'];
    const data = this.filteredPerformances.map(u => [
      u.username,
      u.fullName,
      u.store,
      u.itemsRegistered,
      u.itemsWithdrawn,
      u.totalTransactions,
      u.activityScore,
      this.formatDate(u.lastActivity)
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Math reference for template
  Math = Math;
}
