import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService } from '../services/item.service';
import { AuthService } from '../services/auth.service';
import { Item } from '../model/item.model';
import Kenat from 'kenat';
import { ChartConfiguration } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RoleSummary {
  role: string;
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  mostRecentRegistration: string | null;
  totalValueByCurrency: { currency: string; value: number }[];
  accessoryValueByCurrency: { currency: string; value: number }[];
  combinedValueByCurrency: { currency: string; value: number }[];
}

interface SummaryData {
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  uniqueCategories: number;
  roleSummaries: RoleSummary[];
}

interface LowStockItem {
  itemId: number;
  name: string;
  category: string;
  quantity: number;
  role: string;
}

interface MonthlyTrend {
  month: string;
  totalItems: number;
  totalQuantity: number;
}

@Component({
  selector: 'app-team-leader-dashboard',
  templateUrl: './team-leader-dashboard.component.html',
  styleUrls: ['./team-leader-dashboard.component.css']
})
export class TeamLeaderDashboardComponent implements OnInit {
  summaryData: SummaryData | null = null;
  lowStockItems: LowStockItem[] = [];
  pagedLowStockItems: LowStockItem[] = [];
  monthlyTrends: MonthlyTrend[] = [];
  errorMessage: string | null = null;
  isLoading = false;
  selectedRoles: string[] = [];
  availableRoles = ['VHF', 'HF', 'ELECTRONICS', 'SPAREPART'];
  dropdownOpen = false;
  barChartConfig: ChartConfiguration | null = null;
  lineChartConfig: ChartConfiguration | null = null;

  // 🔥 Pagination state — no dependencies
  lowStockPageSize = 10;
  lowStockCurrentPage = 1;
  lowStockWarehouseFilter = '';
  lowStockCategoryFilter = '';
  filteredLowStockItems: LowStockItem[] = [];

  get uniqueLowStockCategories(): string[] {
    const categories = new Set(this.lowStockItems.map(item => item.category));
    return Array.from(categories).sort();
  }

  get lowStockPageNumbers(): number[] {
    const total = this.lowStockTotalPages;
    const current = this.lowStockCurrentPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.isSupplyAndDistributionLeader()) {
      this.loadAllData();
    } else {
      this.errorMessage = 'Access restricted to Supply and Distribution Team Leader. / መዳረሻ ለሰፕላይ እና ዲስትሪብዩሽን ቡድን መሪ ብቻ ተገድቧል።';
    }
  }

  isSupplyAndDistributionLeader(): boolean {
    return this.authService.getRole() === 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER';
  }

  loadAllData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const rolesToFetch = this.selectedRoles.length > 0 ? this.selectedRoles : this.availableRoles;

    this.itemService.getItemsByRole(rolesToFetch).subscribe({
      next: (items: Item[]) => {
        this.summaryData = this.computeSummaryData(items);
        this.lowStockItems = this.computeLowStockItems(items);
        this.monthlyTrends = this.computeMonthlyTrends(items);
        this.lowStockCurrentPage = 1;
        this.lowStockWarehouseFilter = '';
        this.updatePagedItems();
        this.updateChartConfigs();
        this.isLoading = false;
        if (!items.length) {
          this.errorMessage = 'No items found for the selected roles. / ለተመረጡት ሚናዎች ምንም እቃዎች አልተገኙም።';
        }
      },
      error: (err) => {
        this.errorMessage = `Failed to load data: ${err.message || 'Unknown error'} / መረጃ መጫን አልተሳካም፡ ${err.message || 'ያልታወቀ ስህተት'}`;
        this.isLoading = false;
      }
    });
  }

  computeSummaryData(items: Item[]): SummaryData {
    const roleSummaries: RoleSummary[] = this.availableRoles.map(role => {
      const roleItems = items.filter(item =>
        item.role === role && !item.isStandaloneAccessory
      );
      const totalItems = roleItems.length;
      const totalQuantity = roleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const lowStockItems = roleItems.filter(item => (item.quantity || 0) < 10).length;
      const mostRecentRegistration = roleItems
        .map(item => this.parseDate(item.registrationDate))
        .filter(date => date > 0)
        .sort((a, b) => b - a)[0] || null;

      // Compute item value per currency
      const valueMap = new Map<string, number>();
      roleItems.forEach(item => {
        if ((item.unitPrice || 0) > 0 && item.currency !== 'FOC') {
          const currency = item.currency || 'ETB';
          valueMap.set(currency, (valueMap.get(currency) || 0) + (item.unitPrice || 0) * (item.quantity || 0));
        }
      });
      const totalValueByCurrency = Array.from(valueMap.entries())
        .map(([currency, value]) => ({ currency, value }))
        .sort((a, b) => b.value - a.value);

      // Compute accessory value per currency
      const accValueMap = new Map<string, number>();
      roleItems.forEach(item => {
        (item.accessories || []).forEach((acc: any) => {
          if ((acc.unitPrice || 0) > 0 && acc.currency !== 'FOC' && !acc.isStandalone) {
            const currency = acc.currency || 'ETB';
            accValueMap.set(currency, (accValueMap.get(currency) || 0) + (acc.unitPrice || 0) * (acc.quantity || 0));
          }
        });
      });
      const accessoryValueByCurrency = Array.from(accValueMap.entries())
        .map(([currency, value]) => ({ currency, value }))
        .sort((a, b) => b.value - a.value);

      // Combine both
      const combinedMap = new Map<string, number>();
      [...valueMap.entries(), ...accValueMap.entries()].forEach(([currency, value]) => {
        combinedMap.set(currency, (combinedMap.get(currency) || 0) + value);
      });
      const combinedValueByCurrency = Array.from(combinedMap.entries())
        .map(([currency, value]) => ({ currency, value }))
        .sort((a, b) => b.value - a.value);

      return {
        role,
        totalItems,
        totalQuantity,
        lowStockItems,
        mostRecentRegistration: mostRecentRegistration ? new Date(mostRecentRegistration).toISOString() : null,
        totalValueByCurrency,
        accessoryValueByCurrency,
        combinedValueByCurrency
      };
    });

    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockItems = items.filter(item => (item.quantity || 0) < 10).length;
    const uniqueCategories = new Set(items.map(item => item.category)).size;

    return {
      totalItems,
      totalQuantity,
      lowStockItems,
      uniqueCategories,
      roleSummaries
    };
  }

  computeLowStockItems(items: Item[]): LowStockItem[] {
    return items
      .filter(item => (item.quantity || 0) < 10)
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .map(item => ({
        itemId: item.itemId || 0,
        name: item.description || 'Unknown Item',
        category: item.category || 'Unknown',
        role: item.role || item.category || 'Unknown',
        quantity: item.quantity || 0
      }));
  }

  computeMonthlyTrends(items: Item[]): MonthlyTrend[] {
    const trends: { [key: string]: { totalItems: number; totalQuantity: number } } = {};
    items.forEach(item => {
      const date = item.registrationDate ? new Date(this.parseDate(item.registrationDate)) : new Date();
      if (isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!trends[monthKey]) {
        trends[monthKey] = { totalItems: 0, totalQuantity: 0 };
      }
      trends[monthKey].totalItems += 1;
      trends[monthKey].totalQuantity += item.quantity || 0;
    });

    return Object.keys(trends)
      .map(key => ({
        month: key,
        totalItems: trends[key].totalItems,
        totalQuantity: trends[key].totalQuantity
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }

  updateChartConfigs(): void {
    if (this.summaryData && this.summaryData.roleSummaries.length > 0) {
      this.barChartConfig = {
        type: 'bar',
        data: {
          labels: this.summaryData.roleSummaries.map(rs => rs.role),
          datasets: [
            {
              label: 'Total Items / ጠቅላላ እቃዎች',
              data: this.summaryData.roleSummaries.map(rs => rs.totalItems),
              backgroundColor: '#FF6384'
            },
            {
              label: 'Total Quantity / ጠቅላላ ብዛት',
              data: this.summaryData.roleSummaries.map(rs => rs.totalQuantity),
              backgroundColor: '#36A2EB'
            },
            {
              label: 'Low Stock Items / ዝቅተኛ ክምችት',
              data: this.summaryData.roleSummaries.map(rs => rs.lowStockItems),
              backgroundColor: '#FFCE56'
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      };
    } else {
      this.barChartConfig = null;
    }

    if (this.monthlyTrends.length > 0) {
      this.lineChartConfig = {
        type: 'line',
        data: {
          labels: this.monthlyTrends.map(t => t.month),
          datasets: [
            {
              label: 'Total Items / ጠቅላላ እቃዎች',
              data: this.monthlyTrends.map(t => t.totalItems),
              borderColor: '#36A2EB',
              fill: false
            },
            {
              label: 'Total Quantity / ጠቅላላ ብዛት',
              data: this.monthlyTrends.map(t => t.totalQuantity),
              borderColor: '#FF6384',
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      };
    } else {
      this.lineChartConfig = null;
    }
  }

  parseDate(dateStr: string | null): number {
    if (!dateStr || dateStr === 'Unknown Date') return 0;

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }

    const ethiopicMatch = dateStr.match(/(\w+) (\d+), (\d+)/);
    if (ethiopicMatch) {
      const [, monthName, day, year] = ethiopicMatch;
      const monthNumber = this.getEthiopianMonthNumber(monthName) - 1;
      const gregorianYear = parseInt(year) + 8;
      const tempDate = new Date(gregorianYear, monthNumber, parseInt(day));
      return isNaN(tempDate.getTime()) ? 0 : tempDate.getTime();
    }

    return 0;
  }

  private getEthiopianMonthNumber(monthName: string): number {
    const monthMap: { [key: string]: number } = {
      Meskerem: 1, Tikimt: 2, Hidar: 3, Tahsas: 4, Tir: 5, Yekatit: 6,
      Megabit: 7, Miazia: 8, Ginbot: 9, Sene: 10, Hamle: 11, Nehase: 12, Pagume: 13
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
    this.loadAllData();
  }

  updatePagedItems(): void {
    this.filteredLowStockItems = this.lowStockItems.filter(i => {
      const warehouseMatch = !this.lowStockWarehouseFilter || i.role === this.lowStockWarehouseFilter;
      const categoryMatch = !this.lowStockCategoryFilter || i.category === this.lowStockCategoryFilter;
      return warehouseMatch && categoryMatch;
    });
    const start = (this.lowStockCurrentPage - 1) * this.lowStockPageSize;
    this.pagedLowStockItems = this.filteredLowStockItems.slice(start, start + this.lowStockPageSize);
  }

  onLowStockFilterChange(): void {
    this.lowStockCurrentPage = 1;
    this.updatePagedItems();
    this.cdr.detectChanges();
  }

  get lowStockTotalPages(): number {
    return this.lowStockPageSize > 0
      ? Math.ceil(this.filteredLowStockItems.length / this.lowStockPageSize)
      : 1;
  }

  get lowStockStartIndex(): number {
    return this.filteredLowStockItems.length > 0
      ? (this.lowStockCurrentPage - 1) * this.lowStockPageSize + 1
      : 0;
  }

  get lowStockEndIndex(): number {
    return Math.min(this.lowStockCurrentPage * this.lowStockPageSize, this.filteredLowStockItems.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.lowStockTotalPages && page !== this.lowStockCurrentPage) {
      this.lowStockCurrentPage = page;
      this.updatePagedItems();
      this.cdr.detectChanges();
    }
  }

  changePageSize(newSize: number): void {
    this.lowStockPageSize = newSize;
    this.lowStockCurrentPage = 1;
    this.updatePagedItems();
    this.cdr.detectChanges();
  }

  downloadLowStockReport(): void {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    const warehouse = this.lowStockWarehouseFilter || 'All Warehouses';
    const category = this.lowStockCategoryFilter || 'All Categories';

    // Title
    doc.setFontSize(18);
    doc.text('Team Leader: Low Stock Inventory Report', 14, 20);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Warehouse Filter: ${warehouse}`, 14, 30);
    doc.text(`Category Filter: ${category}`, 14, 37);
    doc.text(`Generated on: ${date}`, 14, 44);

    const tableData = this.filteredLowStockItems.map(item => [
      item.name,
      item.category,
      item.role,
      item.quantity,
      item.quantity < 5 ? 'Critical' : 'Low'
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Item Name', 'Category', 'Role', 'Quantity', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 32, 60] }, // Dark blue header
      styles: { fontSize: 10 }
    });

    const fileName = `TL_Low_Stock_Report_${date.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  }

  navigateToItemDetails(itemId: number): void {
    if (itemId) {
      this.router.navigate(['/item', itemId]);
    }
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      VHF: '📡', HF: '📻', ELECTRONICS: '⚡', SPAREPART: '🔩'
    };
    return icons[role] ?? '🏪';
  }
}