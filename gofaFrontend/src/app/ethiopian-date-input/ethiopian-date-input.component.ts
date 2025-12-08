import { Component, EventEmitter, forwardRef, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-ethiopian-date-input',
  templateUrl: './ethiopian-date-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EthiopianDateInputComponent),
      multi: true,
    },
  ],
})
export class EthiopianDateInputComponent implements OnInit, ControlValueAccessor {

  amharicMonths = [
    'መስከረም',
    'ጥቅምት',
    'ኅዳር',
    'ታህሳስ',
    'ጥር',
    'የካቲት',
    'መጋቢት',
    'ሚያዝያ',
    'ግንቦት',
    'ሰኔ',
    'ሐምሌ',
    'ነሐሴ',
    'ጳጉሜን'
  ];

  years: number[] = [];
  days: number[] = [];

  selectedYear!: number;
  selectedMonth!: number;
  selectedDay!: number;

  // Callbacks for ControlValueAccessor
  private onChange = (value: any) => {};
  private onTouched = () => {};

  ngOnInit() {
    // Initialize years (example: Ethiopian year 2015 ± 10 years)
    const currentEthYear = 2015; // you should replace this with dynamic Ethiopian year
    for (let y = currentEthYear - 10; y <= currentEthYear + 10; y++) {
      this.years.push(y);
    }

    // Initialize default date to current Ethiopian date (simplified)
    this.selectedYear = currentEthYear;
    this.selectedMonth = 1;
    this.updateDays();
    this.selectedDay = 1;
  }

  updateDays() {
    let dayCount = 30;
    // 13th month (ጳጉሜን) has 5 or 6 days depending on leap year
    if (this.selectedMonth === 13) {
      dayCount = this.isEthiopianLeapYear(this.selectedYear) ? 6 : 5;
    }
    this.days = Array.from({ length: dayCount }, (_, i) => i + 1);

    // Adjust selectedDay if out of range after changing month or year
    if (this.selectedDay > dayCount) {
      this.selectedDay = dayCount;
      this.emitChange();
    }
  }

  // Check if Ethiopian year is leap year
  // Ethiopian leap years occur every 4 years without exception
  isEthiopianLeapYear(year: number): boolean {
    return year % 4 === 3;
  }

  onYearChange() {
    this.updateDays();
    this.emitChange();
  }

  onMonthChange() {
    this.updateDays();
    this.emitChange();
  }

  onDayChange() {
    this.emitChange();
  }

  emitChange() {
    const ethiopianDate = {
      year: this.selectedYear,
      month: this.selectedMonth,
      day: this.selectedDay,
    };
    this.onChange(ethiopianDate);
  }

  // ControlValueAccessor methods
  writeValue(obj: any): void {
    if (obj && obj.year && obj.month && obj.day) {
      this.selectedYear = obj.year;
      this.selectedMonth = obj.month;
      this.selectedDay = obj.day;
      this.updateDays();
    }
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    // Handle disabled state if necessary
  }

  // Optional: Convert Ethiopian date to Gregorian date (JS Date)
  // This is a standard algorithm for conversion based on known references
  toGregorian(ethiopianDate: { year: number; month: number; day: number }): Date {
    // Constants
    const ethiopianEpoch = new Date(8, 7, 29); // Sept 12, 8 AD Julian is Ethiopian epoch approx
    // The calculation is a bit involved. Here's a commonly used approach:
    
    const r = (ethiopianDate.year % 4);
    const leapDayCorrection = r === 3 ? 1 : 0;  // Leap year day adjustment

    // Calculate days from Ethiopian epoch to the date
    const daysInYear = (ethiopianDate.year - 1) * 365 + Math.floor((ethiopianDate.year - 1) / 4);
    const daysInMonth = (ethiopianDate.month - 1) * 30;
    const totalDays = daysInYear + daysInMonth + ethiopianDate.day - 1;

    // Ethiopian epoch Julian day number (JD) approx: 1723856 (Sept 11, 8 AD Gregorian)
    const JD = totalDays + 1723856;

    // Convert Julian day to Gregorian date
    const date = this.julianDayToDate(JD);
    return date;
  }

  // Helper to convert Julian Day to JS Date (Gregorian)
  julianDayToDate(jd: number): Date {
    let j = jd + 0.5;
    let jalpha, ja, jb, jc, jd_, je, year, month, day;

    ja = Math.floor(j);
    let jbeta = ja + 32044;
    jc = Math.floor((4 * jbeta + 3) / 146097);
    jd_ = jbeta - Math.floor((146097 * jc) / 4);
    je = Math.floor((4 * jd_ + 3) / 1461);
    let jf = jd_ - Math.floor((1461 * je) / 4);
    let jg = Math.floor((5 * jf + 2) / 153);
    day = jf - Math.floor((153 * jg + 2) / 5) + 1;
    month = jg + 3 - 12 * Math.floor(jg / 10);
    year = 100 * jc + je - 4800 + Math.floor(jg / 10);

    return new Date(year, month - 1, day);
  }
}
