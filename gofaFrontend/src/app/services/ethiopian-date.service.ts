import { Injectable } from '@angular/core';
import { toGregorian, toEthiopian } from 'ethiopian-date';

@Injectable({
  providedIn: 'root'
})
export class EthiopianDateService {
  toEthiopian(date: Date) {
    throw new Error('Method not implemented.');
  }
  toGregorian(ethiopianDate: any) {
    throw new Error('Method not implemented.');
  }
  constructor() {}

  /**
   * Convert Ethiopian to Gregorian.
   * @param year Ethiopian year (e.g. 2016)
   * @param month Ethiopian month (1–13)
   * @param day Ethiopian day (1–30 or 1–6)
   * @returns A Date object in Gregorian
   */
  toGregorianDate(year: number, month: number, day: number): Date {
    const [gYear, gMonth, gDay] = toGregorian([year, month, day]);
    return new Date(gYear, gMonth - 1, gDay); // JS months 0-indexed
  }

  /**
   * Convert Gregorian to Ethiopian.
   * @param date A Gregorian Date object
   * @returns Ethiopian date as [year, month, day]
   */
  toEthiopianDate(date: Date): [number, number, number] {
    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1;
    const gDay = date.getDate();
    return toEthiopian([gYear, gMonth, gDay]);
  }

  /**
   * Get current Ethiopian date as [year, month, day].
   */
  getCurrentEthiopianDate(): [number, number, number] {
    return this.toEthiopianDate(new Date());
  }
}
