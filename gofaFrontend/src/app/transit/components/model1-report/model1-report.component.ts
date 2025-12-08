import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model'; // Assuming Accessory is part of Item or not directly used here
import moment from 'moment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-model1-report',
  templateUrl: './model1-report.component.html',
  styleUrls: ['./model1-report.component.css']
})
export class Model1ReportComponent implements OnInit {
  records: Item[] = [];
  filteredRecords: Item[] = [];
  selectedRange: string = '0'; // Default to show all records
  isLoading: boolean = false;
  errorMessage: string = '';

  ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  constructor(private model1Service: TransitService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.model1Service.getAllModel1Records().subscribe({
      next: (data: Item[]) => {
        this.records = data.map(record => ({
          ...record,
          date: record.date?.trim() ?? '',
          supplier: record.supplier ?? '',
          category: record.category ?? '',
          prno: record.prno ?? '',
          invoiceNo: record.invoiceNo ?? '',
          itemType: record.itemType ?? '',
          contactNumber: record.contactNumber ?? '',
          number: record.number ?? '',
          registeredBy: record.registeredBy ?? '',
          serialNumber: record.serialNumber ?? '',
          description: record.description ?? '',
          unitOfMeasurment: record.unitOfMeasurment ?? '',
          ordered: record.ordered ?? 0,
          received: record.received ?? 0,
          unitOfPrice: record.unitOfPrice ?? '',
          amount: record.amount ?? 0,
          currency: record.currency ?? '',
          location: record.location ?? '',
          remark: record.remark ?? '',
          checkedByName: record.checkedByName ?? '',
          cTitle: record.cTitle ?? '',
          recivedByName: record.recivedByName ?? '',
          rTitle: record.rTitle ?? '',
          authorizedByName: record.authorizedByName ?? '',
          aTitle: record.aTitle ?? '',
          model19Ref: record.model19Ref ?? '',
          quantity: record.quantity ?? 0,
          unitPrice: record.unitPrice ?? 0,
          totalPrice: record.totalPrice ?? 0,
          Manufacturer: record.Manufacturer ?? '',
          Warranty: record.Warranty ?? '',
          ExpiryDate: record.ExpiryDate ?? undefined,
          BatchNumber: record.BatchNumber ?? '',
          DateSentForInspection: record.DateSentForInspection ?? undefined,
          DateReceivedByInspection: record.DateReceivedByInspection ?? undefined,
          DateSentToStore: record.DateSentToStore ?? undefined,
          Store: record.Store ?? '',
          status: record.status ?? '',
          storeType: record.storeType ?? '',
          hasAccessories: record.hasAccessories ?? false,
          accessories: record.accessories ?? [],
          hasExtraItems: record.hasExtraItems ?? false,
          extraItems: record.extraItems ?? []
        }));

        console.log('Loaded records:', this.records);
        this.records.forEach(record => {
          console.log(`Record ID: ${record.model1Id}, Date: ${record.date}, Accessories: ${record.accessories ? record.accessories.length : 0}, ExtraItems: ${record.extraItems ? record.extraItems.length : 0}`);
        });

        this.filterByRange();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load records: ' + (err.message ?? 'Unknown error');
        console.error('Error loading records:', err);
        this.isLoading = false;
      }
    });
  }

  private ethiopianStringToDate(ethDate: string | null): Date | null {
    if (!ethDate || ethDate === 'Unknown Date') {
      console.warn(`Invalid Ethiopian date: ${ethDate}`);
      return null;
    }

    try {
      const cleanedDate = ethDate.trim();
      console.log(`Parsing date: ${cleanedDate}`);

      // Handle YYYY/MM/DD format
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanedDate)) {
        const [year, month, day] = cleanedDate.split('/').map(Number);
        const gregorianYear = year + 7; // Simplified EC to GC conversion
        const parsedDate = moment([gregorianYear, month - 1, day]).startOf('day').toDate();
        if (isNaN(parsedDate.getTime())) {
          console.warn(`Invalid parsed date for: ${cleanedDate}`);
          return null;
        }
        console.log(`Converted YYYY/MM/DD to Gregorian: ${parsedDate.toISOString()}`);
        return parsedDate;
      }

      // Handle Amharic format (e.g., "ነሐሴ 30, 2017" or "ጳጉሜ 3, 2017")
      const parts = cleanedDate.split(/[\s,]+/).filter(part => part);
      if (parts.length !== 3) {
        console.warn(`Invalid date format: ${cleanedDate}, expected 'Month Day, Year'`);
        return null;
      }
      const [monthName, dayStr, yearStr] = parts;
      const monthIndex = this.ethMonthNames.indexOf(monthName);
      if (monthIndex === -1) {
        console.warn(`Invalid month name: ${monthName}`);
        return null;
      }

      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);
      if (isNaN(day) || isNaN(year)) {
        console.warn(`Invalid day or year in: ${cleanedDate}`);
        return null;
      }

      // Ethiopian to Gregorian conversion
      let gregorianYear = year + (monthIndex === 12 ? 8 : 7); // Adjust for Pagumē
      let gregorianMonth = monthIndex; // 0-based for moment
      let gregorianDay = day;

      if (monthIndex === 12) {
        // Pagumē: 5 or 6 days depending on leap year
        const isLeapYear = year % 4 === 3; // Ethiopian leap year
        const maxDays = isLeapYear ? 6 : 5;
        if (day < 1 || day > maxDays) {
          console.warn(`Invalid day ${day} for Pagumē in year ${year} (max: ${maxDays})`);
          return null;
        }
        // Pagumē maps to early September
        gregorianMonth = 8; // September (0-based)
        gregorianDay = day + 4; // Approximate shift (Pagumē 1 ≈ September 5 or 6)
      } else {
        // Validate day for other months (1-30, except for leap year adjustments)
        const maxDays = monthIndex === 11 && year % 4 === 3 ? 6 : 30; // Nehase has 6 days in leap year
        if (day < 1 || day > maxDays) {
          console.warn(`Invalid day ${day} for month ${monthName} in year ${year} (max: ${maxDays})`);
          return null;
        }
        // Adjust for Gregorian month alignment (EC months are ~10 days earlier)
        gregorianDay = day + 10; // Shift forward by ~10 days
        if (gregorianDay > moment([gregorianYear, gregorianMonth]).daysInMonth()) {
          gregorianDay -= moment([gregorianYear, gregorianMonth]).daysInMonth();
          gregorianMonth = (gregorianMonth + 1) % 12;
          if (gregorianMonth === 0) gregorianYear += 1;
        }
      }

      // Create Gregorian date
      const parsedDate = moment([gregorianYear, gregorianMonth, gregorianDay]).startOf('day').toDate();
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid parsed date for: ${cleanedDate}`);
        return null;
      }
      console.log(`Converted to Gregorian: ${parsedDate.toISOString()}`);
      return parsedDate;
    } catch (error) {
      console.error(`Failed to parse Ethiopian date: ${ethDate}`, error);
      return null;
    }
  }

  displayDate(value: string | Date | null | undefined): string {
    if (!value || value === 'Unknown Date') return 'ያልታወቀ ቀን';
    if (typeof value === 'string') {
      try {
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
          const [year, month, day] = value.split('/').map(Number);
          const amharicMonth = this.ethMonthNames[month - 1] ?? 'መስከረም';
          return `${amharicMonth} ${day}, ${year}`;
        }
        if (/[\u1200-\u137F]/.test(value)) {
          return value; // Already in Amharic
        }
        return value; // Return as-is if not in expected format
      } catch (error) {
        console.error('Error formatting Ethiopian date:', error);
        return 'ያልታወቀ ቀን';
      }
    }
    return value instanceof Date && !isNaN(value.getTime()) ? moment(value).format('MMMM D, YYYY') : 'ያልታወቀ ቀን';
  }

  getAccessoriesDisplay(record: Item): string {
    if (!record.accessories?.length) {
      return 'None';
    }
    return record.accessories.map(acc => `${acc.name}: ${acc.quantity}`).join(', ');
  }

  getExtraItemsDisplay(record: Item): string {
    if (!record.extraItems?.length) {
      return 'None';
    }
    return record.extraItems.map(item =>
      `${item.name}: ${item.quantity} (${item.store}, ${item.extraStatus}${item.extraRecivedByName ? ', ' + item.extraRecivedByName : ''})`
    ).join(', ');
  }

  private addMonthsToDate(date: Date, months: number): Date {
    const result = moment(date).add(months, 'months').startOf('month').toDate();
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private addDaysToDate(date: Date, days: number): Date {
    const result = moment(date).add(days, 'days').startOf('day').toDate();
    result.setHours(0, 0, 0, 0);
    return result;
  }

  filterByRange(): void {
    if (this.selectedRange === '0') {
      // Show all records (use existing endpoint)
      this.model1Service.getAllModel1Records().subscribe({
        next: (data: Item[]) => {
          console.log('All records received from backend:');
          data.forEach(record => console.log(`ID: ${record.model1Id}, Date (EC): ${record.date}`));
          this.filteredRecords = data;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load all records: ' + (err.message ?? 'Unknown error');
        }
      });
      return;
    }

    // Use backend filtering
    this.isLoading = true;
    this.model1Service.getModel1ByDateRange(this.selectedRange).subscribe({
      next: (data: Item[]) => {
        console.log(`Filtered records received for range ${this.selectedRange}:`);
        data.forEach(record => console.log(`ID: ${record.model1Id}, Date (EC): ${record.date}`));

        // Optional: try converting EC -> GC in frontend for logging
        data.forEach(record => {
          const gcDate = this.ethiopianStringToDate(record.date);
          console.log(`ID: ${record.model1Id}, EC Date: ${record.date}, GC Date: ${gcDate}`);
        });

        this.filteredRecords = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to filter records: ' + (err.message ?? 'Unknown error');
        this.isLoading = false;
      }
    });
  }

  printDetails(): void {
    const tableElement = document.querySelector('.table-responsive') as HTMLElement;
    if (!tableElement) {
      console.error('Table element not found.');
      this.errorMessage = 'Failed to generate PDF: Table not found.';
      return;
    }

    html2canvas(tableElement, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const marginY = 20;
      const imgWidth = pageWidth - marginX * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const reportTitle = `Transaction Report - ${this.selectedRange === '0' ? 'ALL' : this.selectedRange + (parseInt(this.selectedRange) <= 7 ? ' Days' : ' Months')} Period`;
      pdf.setFontSize(16);
      pdf.text(reportTitle, pageWidth / 2, 15, { align: 'center' });
      const maxHeight = pageHeight - marginY * 2;
      if (imgHeight > maxHeight) {
        const ratio = maxHeight / imgHeight;
        pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth * ratio, maxHeight);
      } else {
        pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
      }
      pdf.save(`Transaction_Report_${this.selectedRange}.pdf`);
    }).catch(err => {
      console.error('Error generating PDF:', err);
      this.errorMessage = 'Failed to generate PDF: ' + (err.message || 'Unknown error');
    });
  }
}