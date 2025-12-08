import { Component, OnInit } from '@angular/core';
import { Model22Service } from '../../services/model22.service';
import { Model22Dto } from '../../model/model22'; // Use Model22Dto
import { AuthService } from '../../services/auth.service';
import * as moment from 'moment'; // Use moment.js for date handling

@Component({
  selector: 'app-model22-report',
  templateUrl: './model22-report.component.html',
  styleUrls: ['./model22-report.component.css']
})
export class Model22ReportComponent implements OnInit {
  model22Data: Model22Dto[] = []; // Changed to Model22Dto
  filteredData: Model22Dto[] = []; // Changed to Model22Dto
  departments: string[] = [];
  selectedDepartment: string = '';
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

  onPeriodChange(): void {
    this.applyFilters();
    this.filteredItemCount = this.filteredData.length;
    console.log(`Period filter applied: ${this.selectedPeriod} months, Filtered count: ${this.filteredItemCount}`);
  }

  applyFilters(): void {
    let filtered = [...this.model22Data];

    const periodMonths = parseInt(this.selectedPeriod, 10);
    const today = new Date();

    // Apply date filter if period > 0
    if (periodMonths > 0) {
      const cutoffDate = this.addMonthsToDate(today, -periodMonths);
      cutoffDate.setHours(0, 0, 0, 0); // Normalize time

      filtered = filtered.filter(item => {
        const itemDate = this.parseEthiopianDate(item.ethiopianDate);
        if (!itemDate) return false;
        itemDate.setHours(0, 0, 0, 0); // Normalize time
        return itemDate >= cutoffDate && itemDate <= today;
      });
    }

    // Filter by department
    if (this.selectedDepartment) {
      filtered = filtered.filter(item => item.department === this.selectedDepartment);
    }

    this.filteredData = filtered;
  }

  private addMonthsToDate(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    result.setDate(1); // First day of the month
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private parseEthiopianDate(ethDate: string | null): Date | null {
    if (!ethDate || ethDate === 'Unknown Date') {
      console.warn(`Invalid Ethiopian date: ${ethDate}`);
      return null;
    }

    try {
      // Handle YYYY/MM/DD format
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(ethDate)) {
        const [year, month, day] = ethDate.split('/').map(Number);
        // Assume Ethiopian Calendar is close to Gregorian for simplicity
        // Adjust for Ethiopian Calendar (approx 7-8 years behind due to calendar difference)
        const gregorianYear = year + 7; // Simplified adjustment
        return new Date(gregorianYear, month - 1, day);
      }

      // Handle Amharic or English month format (e.g., "Yekatit 12, 2018" or "የካቲት 12, 2018")
      const [monthName, day, year] = ethDate.split(/[\s,]+/).filter(part => part);
      const monthIndex = this.ethMonthNames.indexOf(monthName) !== -1
        ? this.ethMonthNames.indexOf(monthName)
        : this.getEnglishMonthNumber(monthName);
      if (monthIndex === -1) throw new Error('Invalid month name');
      const gregorianYear = parseInt(year, 10) + 7; // Simplified EC to GC conversion
      return new Date(gregorianYear, monthIndex, parseInt(day, 10));
    } catch (error) {
      console.error(`Failed to parse Ethiopian date: ${ethDate}`, error);
      return null;
    }
  }

  private getEnglishMonthNumber(monthName: string): number {
    const monthMap: { [key: string]: number } = {
      'Meskerem': 0, 'Tikimt': 1, 'Hidar': 2, 'Tahsas': 3, 'Tir': 4,
      'Yekatit': 5, 'Megabit': 6, 'Miazia': 7, 'Ginbot': 8, 'Sene': 9,
      'Hamle': 10, 'Nehase': 11, 'Pagume': 12
    };
    return monthMap[monthName] !== undefined ? monthMap[monthName] : -1;
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
      // Handle YYYY/MM/DD format
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
        const [year, month, day] = date.split('/').map(Number);
        const amharicMonth = this.ethMonthNames[month - 1] || 'መስከረም';
        return `${amharicMonth} ${day}, ${year}`;
      }
      // Handle legacy formats (e.g., "Yekatit 12, 2018" or Amharic)
      if (/[\u1200-\u137F]/.test(date)) {
        return date; // Already in Amharic
      }
      const [monthName, day, year] = date.split(/[\s,]+/).filter(part => part);
      const monthIndex = this.getEnglishMonthNumber(monthName);
      const amharicMonth = this.ethMonthNames[monthIndex] || 'መስከረም';
      return `${amharicMonth} ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting Ethiopian date:', error);
      return 'ያልታወቀ ቀን';
    }
  }
}