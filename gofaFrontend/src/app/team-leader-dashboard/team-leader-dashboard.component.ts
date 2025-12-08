import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ItemService } from '../services/item.service';
import { AuthService } from '../services/auth.service';
import { Item } from '../model/item.model';
import Kenat from 'kenat';
import { ChartConfiguration } from 'chart.js';

interface RoleSummary {
  role: string;
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  mostRecentRegistration: string | null;
}

interface SummaryData {
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  uniqueCategories: number;
  roleSummaries: RoleSummary[];
}

interface LowStockItem {
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

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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
      const roleItems = items.filter(item => item.role === role || item.category === role);
      const totalItems = roleItems.length;
      const totalQuantity = roleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const lowStockItems = roleItems.filter(item => (item.quantity || 0) < 10).length;
      const mostRecentRegistration = roleItems
        .map(item => this.parseDate(item.registrationDate))
        .filter(date => date > 0)
        .sort((a, b) => b - a)[0] || null;

      return {
        role,
        totalItems,
        totalQuantity,
        lowStockItems,
        mostRecentRegistration: mostRecentRegistration ? new Date(mostRecentRegistration).toISOString() : null
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

  // 🔥 PAGINATION — 100% WORKING
  updatePagedItems(): void {
    const start = (this.lowStockCurrentPage - 1) * this.lowStockPageSize;
    this.pagedLowStockItems = this.lowStockItems.slice(start, start + this.lowStockPageSize);
  }

  get lowStockTotalPages(): number {
    return this.lowStockPageSize > 0 
      ? Math.ceil(this.lowStockItems.length / this.lowStockPageSize) 
      : 1;
  }

  get lowStockStartIndex(): number {
    return this.lowStockItems.length > 0 
      ? (this.lowStockCurrentPage - 1) * this.lowStockPageSize + 1 
      : 0;
  }

  get lowStockEndIndex(): number {
    return Math.min(this.lowStockCurrentPage * this.lowStockPageSize, this.lowStockItems.length);
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
}