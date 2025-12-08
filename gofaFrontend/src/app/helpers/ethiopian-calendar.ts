export function convertToEthiopianDate(gregorianDate: Date): string {
  const gdYear = gregorianDate.getFullYear();
  const gdMonth = gregorianDate.getMonth() + 1; // JS months are 0-based
  const gdDay = gregorianDate.getDate();

  let etYear = gdYear - 8;

  // Check if the date is before Meskerem 1 (Sept 11)
  if (gdMonth < 9 || (gdMonth === 9 && gdDay < 11)) {
    etYear--;
  }

  // Determine if the Ethiopian year is a leap year
  const isLeapYear = etYear % 4 === 3;
  const etMonthDays = [
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    isLeapYear ? 6 : 5
  ];

  // Calculate the day of the Ethiopian year
  const newYearGregorian = new Date(etYear + 8, 8, 11); // Sept 11
  const timeDiff = gregorianDate.getTime() - newYearGregorian.getTime();
  let dayOfYear = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  if (dayOfYear <= 0) {
    // Handle dates before Sept 11 by calculating backwards
    const prevYearGregorian = new Date(etYear + 7, 8, 11);
    const timeDiffPrev = gregorianDate.getTime() - prevYearGregorian.getTime();
    dayOfYear = Math.floor(timeDiffPrev / (1000 * 60 * 60 * 24)) + 1;
  }

  let etMonth = 1;
  let etDay = dayOfYear;

  for (let i = 0; i < etMonthDays.length; i++) {
    if (etDay <= etMonthDays[i]) {
      etMonth = i + 1;
      break;
    }
    etDay -= etMonthDays[i];
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${etYear}-${pad(etMonth)}-${pad(etDay)}`;
}