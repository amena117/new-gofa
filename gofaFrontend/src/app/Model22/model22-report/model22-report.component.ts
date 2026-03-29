import { Component, OnInit } from '@angular/core';
import { Model22Service } from '../../services/model22.service';
import { Model22Dto } from '../../model/model22'; // Use Model22Dto
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-model22-report',
  templateUrl: './model22-report.component.html',
  styleUrls: ['./model22-report.component.css']
})
export class Model22ReportComponent implements OnInit {
  model22Data: Model22Dto[] = []; // Changed to Model22Dto
  filteredData: Model22Dto[] = []; // Changed to Model22Dto
  departments: string[] = [];
  categories: string[] = []; // Add categories list
  selectedDepartment: string = '';
  selectedCategory: string = ''; // Add category filter
  selectedPeriod: string = '0'; // Default to show all data
  loading: boolean = false;
  error: string = '';

  totalItemCount: number = 0; // Total Model22 records loaded
  filteredItemCount: number = 0; // Model22 records after filtering

  ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  constructor(private model22Service: Model22Service, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    const userRole = this.authService.getRole()?.toUpperCase();
    console.group('Model22 Report - Data Load');

    if (!userRole) {
      this.error = 'No role found. Please contact the administrator. / ሚና አልተገኘም። እባክዎ አስተዳዳሪውን ያነጋግሩ።';
      this.loading = false;
      console.error('No user role found');
      console.groupEnd();
      return;
    }

    this.model22Service.getModel22s(userRole).subscribe({
      next: (data: Model22Dto[]) => {
        console.log('Raw data from API:', data);
        const roleFiltered = data.filter(item => item.role === userRole || userRole === 'SUPER_ADMIN');
        this.model22Data = roleFiltered;
        this.departments = [...new Set(roleFiltered.map(item => item.department || 'Unknown / ያልታወቀ'))].sort();
        
        // Extract unique categories from all items
        const allCategories = new Set<string>();
        roleFiltered.forEach(model22 => {
          model22.items.forEach(item => {
            if (item.category) {
              allCategories.add(item.category);
            }
          });
        });
        this.categories = Array.from(allCategories).sort();
        
        this.filteredData = [...this.model22Data];
        this.totalItemCount = roleFiltered.length;
        this.filteredItemCount = this.filteredData.length;
        this.loading = false;
        console.log(`Data filtered by user role (${userRole}). Total records: ${this.totalItemCount}`);
        console.groupEnd();
      },
      error: (err: any) => {
        this.error = 'Failed to load report data / የሪፖርት መረጃ መጫን አልተሳካም';
        this.loading = false;
        console.error('Error fetching data:', err);
        console.groupEnd();
      }
    });
  }

  onDepartmentChange(): void {
    this.applyFilters();
    this.filteredItemCount = this.filteredData.length;
    console.log(`Department filter applied: ${this.selectedDepartment}, Filtered count: ${this.filteredItemCount}`);
  }

  onCategoryChange(): void {
    this.applyFilters();
    this.filteredItemCount = this.filteredData.length;
    console.log(`Category filter applied: ${this.selectedCategory}, Filtered count: ${this.filteredItemCount}`);
  }

  onPeriodChange(): void {
    this.applyFilters();
    this.filteredItemCount = this.filteredData.length;
    console.log(`Period filter applied: ${this.selectedPeriod} months, Filtered count: ${this.filteredItemCount}`);
  }

  applyFilters(): void {
    let filtered = [...this.model22Data];

    const periodMonths = parseInt(this.selectedPeriod, 10);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Apply date filter if period > 0
    if (periodMonths > 0) {
      let cutoffDate: Date;
      
      // Use the same logic as backend
      if (periodMonths === 0.25) { // 1 week
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (periodMonths === 1) {
        cutoffDate = new Date(today);
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      } else if (periodMonths === 3) {
        cutoffDate = new Date(today);
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      } else if (periodMonths === 6) {
        cutoffDate = new Date(today);
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
      } else if (periodMonths === 12) {
        cutoffDate = new Date(today);
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      } else {
        cutoffDate = new Date(today);
        cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);
      }
      
      cutoffDate.setHours(0, 0, 0, 0); // Start of cutoff day

      filtered = filtered.filter(item => {
        const itemDate = this.parseEthiopianDate(item.ethiopianDate);
        if (!itemDate || itemDate.getTime() === 0) return false;
        itemDate.setHours(0, 0, 0, 0); // Normalize time
        return itemDate >= cutoffDate && itemDate <= today;
      });
    }

    // Filter by department
    if (this.selectedDepartment) {
      filtered = filtered.filter(item => item.department === this.selectedDepartment);
    }

    // Filter by category (item category)
    if (this.selectedCategory) {
      filtered = filtered.filter(model22 => 
        model22.items.some(item => item.category === this.selectedCategory)
      );
    }

    this.filteredData = filtered;
  }

  private parseEthiopianDate(ethDate: string | null): Date | null {
    if (!ethDate || ethDate === 'Unknown Date') {
      return null;
    }

    try {
      const [monthStr, day, year] = ethDate.split(/[\s,]+/);
      const ethMonths = [
        'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
        'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
      ];

      const monthIndex = ethMonths.indexOf(monthStr);
      if (monthIndex === -1 || !day || !year) {
        console.warn(`Invalid Ethiopian date format: ${ethDate}`);
        return null;
      }

      // Convert Ethiopian to Gregorian (approximate: +7 years, +8 days)
      const gregorianYear = parseInt(year) + 7;
      const gregorianDate = new Date(gregorianYear, monthIndex, parseInt(day) + 8);
      
      if (isNaN(gregorianDate.getTime())) {
        console.warn(`Failed to parse Ethiopian date: ${ethDate}`);
        return null;
      }

      return gregorianDate;
    } catch (error) {
      console.error(`Error parsing Ethiopian date: ${ethDate}`, error);
      return null;
    }
  }

  calculateModel22Total(model22: Model22Dto): { total: number, currency: string } {
    if (!model22.items || model22.items.length === 0) {
      return { total: 0, currency: 'ETB' };
    }
    const total = model22.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
    const currency = model22.items[0]?.currency || 'ETB'; // Use first item's currency or default to ETB
    return { total, currency };
  }

  calculateGrandTotal(): { total: number, currency: string } {
    if (this.filteredData.length === 0) {
      return { total: 0, currency: 'ETB' };
    }
    const totals = this.filteredData.map(model22 => this.calculateModel22Total(model22));
    // Assume all items in filteredData use the same currency for simplicity
    const currency = totals[0]?.currency || 'ETB';
    const total = totals.reduce((sum, t) => sum + t.total, 0);
    return { total, currency };
  }

  formatEthiopianDate(date: string | null): string {
    if (!date || date === 'Unknown Date') {
      return 'ያልታወቀ ቀን';
    }
    try {
      // If already in Amharic format, return as is
      if (/[\u1200-\u137F]/.test(date)) {
        return date;
      }
      
      // Handle YYYY/MM/DD format
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
        const [year, month, day] = date.split('/').map(Number);
        const amharicMonth = this.ethMonthNames[month - 1] || 'መስከረም';
        return `${amharicMonth} ${day}, ${year}`;
      }
      
      // For other formats, just return as is
      return date;
    } catch (error) {
      console.error('Error formatting Ethiopian date:', error);
      return 'ያልታወቀ ቀን';
    }
  }

}
