export class EthiopianDateUtils {
  /**
   * Converts Gregorian date to Ethiopian date
   * @param gYear Gregorian year
   * @param gMonth Gregorian month (1-12)
   * @param gDay Gregorian day
   * @returns Ethiopian date object {year, month, day}
   */
  static gregorianToEthiopian(gYear: number, gMonth: number, gDay: number): { year: number; month: number; day: number } {
    // Ethiopian new year starts on September 11 (or 12 in Gregorian leap years)
    const newYearDay = this.isGregorianLeapYear(gYear) ? 12 : 11;
    
    // Calculate Ethiopian year
    let ethiopianYear = gYear - 8;
    if (gMonth < 9 || (gMonth === 9 && gDay < newYearDay)) {
      ethiopianYear--;
    }
    
    // Calculate days since Ethiopian new year
    const gregDate = new Date(gYear, gMonth - 1, gDay);
    const ethNewYear = new Date(ethiopianYear + 8, 8, newYearDay); // September is month 8 (0-indexed)
    const diffDays = Math.floor((gregDate.getTime() - ethNewYear.getTime()) / (1000 * 60 * 60 * 24));
    
    let ethiopianMonth = Math.floor(diffDays / 30) + 1;
    let ethiopianDay = (diffDays % 30) + 1;
    
    // Handle Pagumē (6 days in normal years, 5 in leap years)
    if (ethiopianMonth === 13) {
      const isEthiopianLeapYear = (ethiopianYear % 4) === 3;
      const pagumeDays = isEthiopianLeapYear ? 6 : 5;
      
      if (ethiopianDay > pagumeDays) {
        ethiopianMonth = 1;
        ethiopianYear++;
        ethiopianDay = 1;
      }
    }
    
    return {
      year: ethiopianYear,
      month: ethiopianMonth,
      day: ethiopianDay
    };
  }

  /**
   * Converts Ethiopian date to Gregorian date
   * @param eYear Ethiopian year
   * @param eMonth Ethiopian month (1-13)
   * @param eDay Ethiopian day
   * @returns Gregorian date object {year, month, day}
   */
  static ethiopianToGregorian(eYear: number, eMonth: number, eDay: number): { year: number; month: number; day: number } {
    // Calculate Gregorian year
    const gregorianYear = eYear + 8;
    
    // New year day in Gregorian calendar (September 11 or 12)
    const newYearDay = this.isGregorianLeapYear(gregorianYear) ? 12 : 11;
    
    // Start with Ethiopian new year in Gregorian calendar
    const ethNewYear = new Date(gregorianYear, 8, newYearDay); // September is month 8 (0-indexed)
    
    // Calculate days to add
    let daysToAdd = 0;
    
    // Add days for full months
    if (eMonth <= 12) {
      daysToAdd = (eMonth - 1) * 30 + (eDay - 1);
    } else {
      // Handle Pagumē month
      const isEthiopianLeapYear = (eYear % 4) === 3;
      const pagumeDays = isEthiopianLeapYear ? 6 : 5;
      
      if (eDay > pagumeDays) {
        throw new Error(`Invalid day ${eDay} for Pagumē month in year ${eYear}`);
      }
      
      daysToAdd = 12 * 30 + (eDay - 1);
    }
    
    // Calculate final date
    const resultDate = new Date(ethNewYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    return {
      year: resultDate.getFullYear(),
      month: resultDate.getMonth() + 1,
      day: resultDate.getDate()
    };
  }

  /**
   * Gets current Ethiopian date as formatted string
   * @returns Formatted Ethiopian date string (e.g., "Meskerem 1, 2015")
   */
  static getCurrentEthiopianDate(): string {
    const now = new Date();
    const ethDate = this.gregorianToEthiopian(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    
    return this.formatEthiopianDate(ethDate.year, ethDate.month, ethDate.day);
  }

  /**
   * Formats Ethiopian date as string
   * @param year Ethiopian year
   * @param month Ethiopian month (1-13)
   * @param day Ethiopian day
   * @returns Formatted date string
   */
  static formatEthiopianDate(year: number, month: number, day: number): string {
    const ethiopianMonths = [
      'Meskerem', 'Tikimit', 'Hedar', 'Tahasass', 'Tir', 'Yekatit', 
      'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumē'
    ];
    
    if (month < 1 || month > 13) {
      throw new Error(`Invalid Ethiopian month: ${month}`);
    }
    
    return `${ethiopianMonths[month - 1]} ${day}, ${year}`;
  }

  /**
   * Checks if a Gregorian year is a leap year
   * @param year Gregorian year
   * @returns true if leap year
   */
  private static isGregorianLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
}