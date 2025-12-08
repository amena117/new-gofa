using System;
using EthiopianCalendar;

namespace Gofabackend.Helpers
{
    public static class EthiopianDateHelper
    {
        public static string ToEthiopianDate(DateTime date)
        {
            // Convert to Ethiopian date using the correct method
            var ethiopianDate = new EthiopianDate(date);
            
            var monthNames = new[] {
                "መስከረም", "ጥቅምት", "ኅዳር", "ታህሳስ", "ጥር", "የካቲት",
                "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜን"
            };

            string monthName = monthNames[ethiopianDate.Month - 1];
            if (ethiopianDate.Month == 13 && ethiopianDate.Day > 5)
            {
                monthName = monthNames[12]; // ጳጉሜን
            }

            return $"{ethiopianDate.Day} {monthName} {ethiopianDate.Year} እ.ኤ.አ.";
        }
    }
} 