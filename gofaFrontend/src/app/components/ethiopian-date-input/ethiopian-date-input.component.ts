// import { Component, forwardRef, Input, OnInit } from '@angular/core';
// import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
// import { EthiopianDateService } from '../../services/ethiopian-date.service';

// @Component({
//   selector: 'app-ethiopian-date-input',
//   template: `
//     <div class="form-group">
//       <label [for]="id">{{ label }}</label>
//       <div class="input-group">
//         <input
//           type="text"
//           [id]="id"
//           [name]="name"
//           class="form-control"
//           [value]="displayDate"
//           (click)="toggleCalendar()"
//           (blur)="onBlur()"
//           [required]="required"
//           [disabled]="disabled"
//           readonly
//         />
//         <div class="input-group-append">
//           <button class="btn btn-outline-secondary" type="button" (click)="toggleCalendar()">
//             <i class="fas fa-calendar"></i>
//           </button>
//         </div>
//       </div>
//       <div *ngIf="errorMessage" class="text-danger">{{ errorMessage }}</div>

//       <!-- Calendar Popup -->
//       <div class="calendar-popup" *ngIf="showCalendar">
//         <div class="calendar-header">
//           <div class="calendar-controls">
//             <button class="btn btn-sm btn-outline-primary" (click)="previousMonth()">
//               <i class="fas fa-chevron-left"></i>
//             </button>
//             <div class="month-year-selector">
//               <select class="form-control form-control-sm" [(ngModel)]="currentMonth" (change)="updateCalendar()">
//                 <option *ngFor="let month of months" [value]="month.value">{{ month.name }}</option>
//               </select>
//               <select class="form-control form-control-sm" [(ngModel)]="currentYear" (change)="updateCalendar()">
//                 <option *ngFor="let year of years" [value]="year">{{ year }}</option>
//               </select>
//             </div>
//             <button class="btn btn-sm btn-outline-primary" (click)="nextMonth()">
//               <i class="fas fa-chevron-right"></i>
//             </button>
//           </div>
//         </div>
//         <div class="calendar-body">
//           <div class="weekdays">
//             <div *ngFor="let day of weekDays">{{ day }}</div>
//           </div>
//           <div class="days">
//             <div *ngFor="let day of calendarDays" 
//                  [class.selected]="isSelected(day)"
//                  [class.disabled]="!day.enabled"
//                  [class.today]="isToday(day)"
//                  (click)="selectDate(day)">
//               {{ day.date }}
//             </div>
//           </div>
//         </div>
//         <div class="calendar-footer">
//           <button class="btn btn-sm btn-outline-secondary" (click)="selectToday()">Today</button>
//           <button class="btn btn-sm btn-outline-secondary" (click)="clearDate()">Clear</button>
//         </div>
//       </div>
//     </div>
//   `,
//   styles: [`
//     .calendar-popup {
//       position: absolute;
//       z-index: 1000;
//       background: white;
//       border: 1px solid #ddd;
//       border-radius: 12px;
//       box-shadow: 0 8px 24px rgba(0,0,0,0.15);
//       width: 340px;
//       margin-top: 5px;
//       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//     }

//     .calendar-header {
//       padding: 16px;
//       background: #f8f9fa;
//       border-bottom: 1px solid #e9ecef;
//       border-radius: 12px 12px 0 0;
//     }

//     .calendar-controls {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       gap: 12px;
//     }

//     .month-year-selector {
//       display: flex;
//       gap: 12px;
//       flex: 1;
//     }

//     .month-year-selector select {
//       flex: 1;
//       font-size: 0.95rem;
//       padding: 6px 12px;
//       border: 1px solid #ced4da;
//       border-radius: 6px;
//       background-color: white;
//       cursor: pointer;
//       transition: all 0.2s ease;
//     }

//     .month-year-selector select:hover {
//       border-color: #007bff;
//     }

//     .month-year-selector select:focus {
//       outline: none;
//       border-color: #007bff;
//       box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
//     }

//     .calendar-body {
//       padding: 16px;
//     }

//     .weekdays {
//       display: grid;
//       grid-template-columns: repeat(7, 1fr);
//       text-align: center;
//       font-weight: 600;
//       margin-bottom: 12px;
//       color: #495057;
//       font-size: 0.9rem;
//     }

//     .days {
//       display: grid;
//       grid-template-columns: repeat(7, 1fr);
//       gap: 6px;
//     }

//     .days div {
//       text-align: center;
//       padding: 10px;
//       cursor: pointer;
//       border-radius: 8px;
//       transition: all 0.2s ease;
//       font-size: 0.95rem;
//       position: relative;
//       aspect-ratio: 1;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//     }

//     .days div:hover:not(.disabled) {
//       background: #e9ecef;
//       transform: scale(1.1);
//       z-index: 1;
//     }

//     .days div.selected {
//       background: #007bff;
//       color: white;
//       font-weight: 600;
//       box-shadow: 0 2px 8px rgba(0,123,255,0.3);
//     }

//     .days div.today {
//       border: 2px solid #007bff;
//       font-weight: 600;
//       color: #007bff;
//     }

//     .days div.disabled {
//       color: #dee2e6;
//       cursor: not-allowed;
//     }

//     .calendar-footer {
//       padding: 16px;
//       border-top: 1px solid #e9ecef;
//       display: flex;
//       justify-content: space-between;
//       gap: 12px;
//     }

//     .btn-outline-primary {
//       color: #007bff;
//       border-color: #007bff;
//       padding: 8px 12px;
//       border-radius: 6px;
//       transition: all 0.2s ease;
//       background: white;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       width: 36px;
//       height: 36px;
//     }

//     .btn-outline-primary:hover {
//       background-color: #007bff;
//       color: white;
//       transform: scale(1.05);
//     }

//     .btn-outline-secondary {
//       color: #6c757d;
//       border-color: #6c757d;
//       padding: 8px 16px;
//       border-radius: 6px;
//       transition: all 0.2s ease;
//       font-weight: 500;
//     }

//     .btn-outline-secondary:hover {
//       background-color: #6c757d;
//       color: white;
//       transform: scale(1.05);
//     }

//     .input-group {
//       position: relative;
//     }

//     .input-group .form-control {
//       padding-right: 40px;
//       border-radius: 6px;
//       border: 1px solid #ced4da;
//       transition: all 0.2s ease;
//     }

//     .input-group .form-control:focus {
//       border-color: #007bff;
//       box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
//     }

//     .input-group-append .btn {
//       border-radius: 0 6px 6px 0;
//       border: 1px solid #ced4da;
//       border-left: none;
//       background: white;
//       color: #6c757d;
//       transition: all 0.2s ease;
//     }

//     .input-group-append .btn:hover {
//       background: #f8f9fa;
//       color: #007bff;
//     }
//   `],
//   standalone: true
//   providers: [
//     {
//       provide: NG_VALUE_ACCESSOR,
//       useExisting: forwardRef(() => EthiopianDateInputComponent),
//       multi: true
//     }
//   ]
// })
// export class EthiopianDateInputComponent implements ControlValueAccessor, OnInit {
//   @Input() id: string = '';
//   @Input() name: string = '';
//   @Input() label: string = 'Date';
//   @Input() required: boolean = false;
//   @Input() disabled: boolean = false;

//   value: string = '';
//   displayDate: string = '';
//   errorMessage: string = '';
//   showCalendar: boolean = false;
//   currentYear: number = 0;
//   currentMonth: number = 0;
//   currentMonthName: string = '';
//   weekDays: string[] = ['እ', 'ሰ', 'ማ', 'ረ', 'ሐ', 'አ', 'ቅ'];
//   calendarDays: { date: number; enabled: boolean }[] = [];
//   months: { value: number; name: string }[] = [];
//   years: number[] = [];

//   private onChange: any = () => {};
//   private onTouched: any = () => {};

//   constructor(private ethiopianDateService: EthiopianDateService) {}

//   ngOnInit() {
//     if (!this.id) {
//       this.id = `ethiopian-date-${Math.random().toString(36).substr(2, 9)}`;
//     }
//     this.initializeMonths();
//     this.initializeYears();
//     this.initializeCalendar();
//   }

//   writeValue(value: any): void {
//     if (value) {
//       const date = typeof value === 'string' ? new Date(value) : value;
//       this.value = this.ethiopianDateService.toEthiopian(date);
//       this.updateDisplayDate();
//       this.initializeCalendar();
//     }
//   }

//   registerOnChange(fn: any): void {
//     this.onChange = fn;
//   }

//   registerOnTouched(fn: any): void {
//     this.onTouched = fn;
//   }

//   setDisabledState(isDisabled: boolean): void {
//     this.disabled = isDisabled;
//   }

//   toggleCalendar(): void {
//     if (!this.disabled) {
//       this.showCalendar = !this.showCalendar;
//     }
//   }

//   previousMonth(): void {
//     if (this.currentMonth === 1) {
//       this.currentMonth = 13;
//       this.currentYear--;
//     } else {
//       this.currentMonth--;
//     }
//     this.updateCalendar();
//   }

//   nextMonth(): void {
//     if (this.currentMonth === 13) {
//       this.currentMonth = 1;
//       this.currentYear++;
//     } else {
//       this.currentMonth++;
//     }
//     this.updateCalendar();
//   }

//   selectDate(day: { date: number; enabled: boolean }): void {
//     if (day.enabled) {
//       const selectedDate = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}-${day.date.toString().padStart(2, '0')}`;
//       this.value = selectedDate;
//       this.updateDisplayDate();
//       const gregorianDate = this.ethiopianDateService.toGregorian(selectedDate);
//       this.onChange(gregorianDate);
//       this.showCalendar = false;
//     }
//   }

//   selectToday(): void {
//     const today = new Date();
//     const ethiopianDate = this.ethiopianDateService.julianToEthiopian(
//       this.ethiopianDateService.toJulianDay(today)
//     );
//     this.currentYear = ethiopianDate.year;
//     this.currentMonth = ethiopianDate.month;
//     this.selectDate({ date: ethiopianDate.day, enabled: true });
//   }

//   clearDate(): void {
//     this.value = '';
//     this.displayDate = '';
//     this.onChange(null);
//     this.showCalendar = false;
//   }

//   isSelected(day: { date: number; enabled: boolean }): boolean {
//     if (!this.value) return false;
//     const [year, month, date] = this.value.split('-').map(Number);
//     return year === this.currentYear && month === this.currentMonth && date === day.date;
//   }

//   isToday(day: { date: number; enabled: boolean }): boolean {
//     const today = new Date();
//     const ethiopianDate = this.ethiopianDateService.julianToEthiopian(
//       this.ethiopianDateService.toJulianDay(today)
//     );
//     return day.enabled && 
//            ethiopianDate.year === this.currentYear && 
//            ethiopianDate.month === this.currentMonth && 
//            ethiopianDate.day === day.date;
//   }

//   private initializeMonths(): void {
//     this.months = [
//       { value: 1, name: 'መስከረም' },
//       { value: 2, name: 'ጥቅምት' },
//       { value: 3, name: 'ኅዳር' },
//       { value: 4, name: 'ታህሳስ' },
//       { value: 5, name: 'ጥር' },
//       { value: 6, name: 'የካቲት' },
//       { value: 7, name: 'መጋቢት' },
//       { value: 8, name: 'ሚያዝያ' },
//       { value: 9, name: 'ግንቦት' },
//       { value: 10, name: 'ሰኔ' },
//       { value: 11, name: 'ሐምሌ' },
//       { value: 12, name: 'ነሐሴ' },
//       { value: 13, name: 'ጳጉሜን' }
//     ];
//   }

//   private initializeYears(): void {
//     const currentYear = new Date().getFullYear();
//     const ethiopianYear = this.ethiopianDateService.julianToEthiopian(
//       this.ethiopianDateService.toJulianDay(new Date())
//     ).year;
//     this.years = Array.from({ length: 20 }, (_, i) => ethiopianYear - 10 + i);
//   }

//   private initializeCalendar(): void {
//     const today = new Date();
//     const ethiopianDate = this.ethiopianDateService.julianToEthiopian(
//       this.ethiopianDateService.toJulianDay(today)
//     );
//     this.currentYear = ethiopianDate.year;
//     this.currentMonth = ethiopianDate.month;
//     this.updateCalendar();
//   }

//   private updateDisplayDate(): void {
//     if (this.value) {
//       this.displayDate = this.ethiopianDateService.formatDate(new Date(this.value));
//     } else {
//       this.displayDate = '';
//     }
//   }

//   updateCalendar(): void {
//     this.currentMonthName = this.ethiopianDateService.getAmharicMonthName(this.currentMonth);
//     this.calendarDays = [];
    
//     // Get the first day of the month
//     const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
//     const startingDay = firstDay.getDay();
    
//     // Add empty cells for days before the first day of the month
//     for (let i = 0; i < startingDay; i++) {
//       this.calendarDays.push({ date: 0, enabled: false });
//     }
    
//     // Add days of the month
//     const daysInMonth = this.currentMonth === 13 ? 5 : 30;
//     for (let i = 1; i <= daysInMonth; i++) {
//       this.calendarDays.push({ date: i, enabled: true });
//     }
//   }

//   onBlur(): void {
//     this.onTouched();
//     // Delay hiding the calendar to allow for date selection
//     setTimeout(() => {
//       this.showCalendar = false;
//     }, 200);
//   }
// } 