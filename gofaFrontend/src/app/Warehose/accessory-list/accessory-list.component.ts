import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';

interface AccessoryListing {
  accessoryId: number;
  name: string;
  model: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  requiresSerialNumbers: boolean;
  isStandalone: boolean;
  parentItemId: number;
  parentItemDescription: string;
  parentItemModel: string;
  parentItemCategory: string;
  parentItemRole: string;
  parentItemDate?: string;
  serialNumbersCount: number;
  serialNumbers: { id: number; serialNumber: string }[];
}

@Component({
  selector: 'app-accessory-list',
  templateUrl: './accessory-list.component.html',
  styleUrls: ['./accessory-list.component.scss']
})
export class AccessoryListComponent implements OnInit {
  accessories: AccessoryListing[] = [];
  filteredAccessories: AccessoryListing[] = [];
  paginatedAccessories: AccessoryListing[] = []; // ✅ For displaying current page
  isLoading = true;
  errorMessage: string | null = null;
  searchTerm = '';
  userRole: string | null = null;
  serialNumberFilter: 'all' | 'with' | 'without' = 'all';
  selectedParentItem: string = 'all';
  selectedRoleFilter: string = 'all'; // New role filter
  parentItems: { id: number; description: string; count: number }[] = [];
  availableRoles: string[] = ['VHF', 'HF', 'ELECTRONICS', 'SPAREPART']; // Available roles for filtering
  
  // ✅ Pagination properties
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  Math = Math; // ✅ Expose Math to template

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.loadAccessories();
  }

  loadAccessories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Team leader should see all accessories from all stores
    const roles = this.userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER' 
      ? ['VHF', 'HF', 'ELECTRONICS', 'SPAREPART']
      : this.userRole ? [this.userRole] : ['VHF', 'HF', 'ELECTRONICS', 'SPAREPART'];

    this.itemService.getAccessoriesByRole(roles).subscribe({
      next: (accessories) => {
        this.accessories = accessories;
        this.buildParentItemsList();
        this.applyFilters();
        this.isLoading = false;
        console.log('Loaded accessories:', accessories);
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to load accessories';
        this.isLoading = false;
        console.error('Error loading accessories:', err);
      }
    });
  }

  buildParentItemsList(): void {
    const itemMap = new Map<number, { description: string; count: number }>();
    
    this.accessories.forEach(acc => {
      if (itemMap.has(acc.parentItemId)) {
        itemMap.get(acc.parentItemId)!.count++;
      } else {
        itemMap.set(acc.parentItemId, {
          description: acc.parentItemDescription,
          count: 1
        });
      }
    });

    this.parentItems = Array.from(itemMap.entries())
      .map(([id, data]) => ({
        id,
        description: data.description,
        count: data.count
      }))
      .sort((a, b) => a.description.localeCompare(b.description));
  }

  onSearch(): void {
    this.applyFilters();
  }

  onSerialNumberFilterChange(): void {
    this.applyFilters();
  }

  onParentItemFilterChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.accessories];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(acc =>
        acc.name.toLowerCase().includes(term) ||
        acc.model.toLowerCase().includes(term) ||
        acc.parentItemDescription.toLowerCase().includes(term) ||
        acc.parentItemCategory.toLowerCase().includes(term)
      );
    }

    // Apply role filter (only for team leader)
    if (this.userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER' && this.selectedRoleFilter !== 'all') {
      filtered = filtered.filter(acc => acc.parentItemRole === this.selectedRoleFilter);
    }

    // Apply serial number filter
    if (this.serialNumberFilter === 'with') {
      filtered = filtered.filter(acc => acc.requiresSerialNumbers);
    } else if (this.serialNumberFilter === 'without') {
      filtered = filtered.filter(acc => !acc.requiresSerialNumbers);
    }

    // Apply parent item filter
    if (this.selectedParentItem !== 'all') {
      const parentItemId = parseInt(this.selectedParentItem);
      filtered = filtered.filter(acc => acc.parentItemId === parentItemId);
    }

    this.filteredAccessories = filtered;
    
    // ✅ Reset to first page when filters change
    this.currentPage = 1;
    this.updatePagination();
  }

  // ✅ Update pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredAccessories.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedAccessories = this.filteredAccessories.slice(startIndex, endIndex);
  }

  // ✅ Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  get accessoriesWithSerialNumbers(): number {
    return this.accessories.filter(acc => acc.requiresSerialNumbers).length;
  }

  get accessoriesWithoutSerialNumbers(): number {
    return this.accessories.filter(acc => !acc.requiresSerialNumbers).length;
  }

  // Summary card getters - these calculate from ALL accessories, not just current page
  get totalAccessories(): number {
    return this.accessories.length; // ✅ All accessories
  }

  get totalQuantity(): number {
    return this.accessories.reduce((sum, acc) => sum + acc.quantity, 0); // ✅ All accessories
  }

  get totalValue(): string {
    // Group by currency from ALL accessories
    const valueByCurrency = new Map<string, number>();
    
    this.accessories.forEach(acc => { // ✅ All accessories
      const value = acc.quantity * (acc.unitPrice || 0);
      const currency = acc.currency || 'ETB';
      
      if (currency === 'FOC') return; // Skip FOC
      
      const current = valueByCurrency.get(currency) || 0;
      valueByCurrency.set(currency, current + value);
    });

    // Format as "10,000.00 ETB | 2,000.00 USD"
    const parts: string[] = [];
    valueByCurrency.forEach((value, currency) => {
      parts.push(`${value.toFixed(2)} ${currency}`);
    });

    return parts.length > 0 ? parts.join(' | ') : '0.00 ETB';
  }

  get uniqueParentItems(): number {
    return new Set(this.accessories.map(acc => acc.parentItemId)).size; // ✅ All accessories
  }

  get isTeamLeader(): boolean {
    return this.userRole === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER';
  }

  withdrawAccessory(accessory: AccessoryListing): void {
    this.router.navigate(['/accessory-withdrawal'], {
      state: { accessory }
    });
  }

  viewParentItem(parentItemId: number): void {
    this.router.navigate(['/item', parentItemId]);
  }
}
