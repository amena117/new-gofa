using System;

namespace Gofabackend.Utilities
{
    public static class EthiopianCalendarConverter
    {
        public static (int Year, int Month, int Day) GregorianToEthiopian(DateTime gregorianDate)
        {
            try
            {
                // Use only the date component to ignore time zones
                gregorianDate = gregorianDate.Date;

                // Determine if the Gregorian year is a leap year (affects Ethiopian New Year day)
                bool isGregorianLeapYear = DateTime.IsLeapYear(gregorianDate.Year);

                // Ethiopian New Year in Gregorian calendar falls on September 11 except on Gregorian leap years, then September 12
                int newYearDay = isGregorianLeapYear ? 12 : 11;
                DateTime ethiopianNewYear = new DateTime(gregorianDate.Year, 9, newYearDay);

                // Calculate the Ethiopian year (7 or 8 years behind Gregorian based on whether date is before or after Ethiopian New Year)
                int ethiopianYear = gregorianDate >= ethiopianNewYear ? gregorianDate.Year - 7 : gregorianDate.Year - 8;

                // Check Ethiopian leap year: Every 4 years without exception (year % 4 == 3 in Ethiopian reckoning)
                bool isEthiopianLeapYear = (ethiopianYear + 1) % 4 == 0;

                // If gregorianDate is before Ethiopian New Year of the computed year, adjust Ethiopian New Year back a year
                if (gregorianDate < ethiopianNewYear)
                {
                    isGregorianLeapYear = DateTime.IsLeapYear(gregorianDate.Year - 1);
                    newYearDay = isGregorianLeapYear ? 12 : 11;
                    ethiopianNewYear = new DateTime(gregorianDate.Year - 1, 9, newYearDay);
                    ethiopianYear = gregorianDate.Year - 8;
                }

                // Days since Ethiopian New Year
                int daysSinceNewYear = (gregorianDate - ethiopianNewYear).Days;

                int ethiopianMonth, ethiopianDay;

                if (daysSinceNewYear < 360)
                {
                    ethiopianMonth = (daysSinceNewYear / 30) + 1;
                    ethiopianDay = (daysSinceNewYear % 30) + 1;
                }
                else
                {
                    ethiopianMonth = 13;
                    ethiopianDay = daysSinceNewYear - 360 + 1;
                    int pagumeDays = isEthiopianLeapYear ? 6 : 5;

                    if (ethiopianDay > pagumeDays)
                    {
                        throw new ArgumentException($"Invalid day in Pagumē: {ethiopianDay}. Must be 1–{pagumeDays}.");
                    }
                }

                return (ethiopianYear, ethiopianMonth, ethiopianDay);
            }
            catch (Exception ex)
            {
                throw new Exception("Failed to convert Gregorian date to Ethiopian date.", ex);
            }
        }

        public static string ToEthiopianString(DateTime gregorianDate)
        {
            try
            {
                var (year, month, day) = GregorianToEthiopian(gregorianDate);
                string[] amharicMonths = {
          "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
          "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
        };
                return $"{amharicMonths[month - 1]} {day}, {year}";
            }
            catch (Exception ex)
            {
                throw new Exception("Failed to format Ethiopian date string in Amharic.", ex);
            }
        }

        public static bool TryParseEthiopianDate(string ethiopianDate, out DateTime gregorianDate)
        {
            gregorianDate = DateTime.MinValue;

            if (string.IsNullOrWhiteSpace(ethiopianDate))
                return false;

            try
            {
                // Split by comma to separate month-day from year
                var parts = ethiopianDate.Split(',');
                if (parts.Length != 2) return false;

                var monthDay = parts[0].Trim();
                var yearStr = parts[1].Trim();

                if (!int.TryParse(yearStr, out int year)) return false;

                // Split month and day (e.g., "ነሐሴ 1" → ["ነሐሴ", "1"])
                var monthDayParts = monthDay.Split(' ');
                if (monthDayParts.Length < 2) return false;

                string amharicMonth = monthDayParts[0];
                if (!int.TryParse(monthDayParts[1], out int day)) return false;

                // Map Amharic months to numbers (1–13)
                var monthMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    ["መስከረም"] = 1,
                    ["ጥቅምት"] = 2,
                    ["ህዳር"] = 3,
                    ["ታህሳስ"] = 4,
                    ["ጥር"] = 5,
                    ["የካቲት"] = 6,
                    ["መጋቢት"] = 7,
                    ["ሚያዝያ"] = 8,
                    ["ግንቦት"] = 9,
                    ["ሰኔ"] = 10,
                    ["ሐምሌ"] = 11,
                    ["ነሐሴ"] = 12,
                    ["ጳጉሜ"] = 13
                };

                if (!monthMap.TryGetValue(amharicMonth, out int month)) return false;

                // Calculate days since Ethiopian New Year
                bool isEthiopianLeapYear = (year + 1) % 4 == 0;
                int daysInYear = isEthiopianLeapYear ? 366 : 365;

                int daysSinceStart;
                if (month == 13) // Pagumé
                {
                    int pagumeDays = isEthiopianLeapYear ? 6 : 5;
                    if (day > pagumeDays) return false;
                    daysSinceStart = 360 + (day - 1); // Pagumé starts after 12 months × 30 days
                }
                else
                {
                    if (day < 1 || day > 30) return false;
                    daysSinceStart = (month - 1) * 30 + (day - 1);
                }

                // Ethiopian New Year in Gregorian: September 11 or 12
                bool isGregorianLeapYear = DateTime.IsLeapYear(year + 7);
                int newYearDay = isGregorianLeapYear ? 12 : 11;
                DateTime ethiopianNewYear = new DateTime(year + 7, 9, newYearDay);

                gregorianDate = ethiopianNewYear.AddDays(daysSinceStart);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
