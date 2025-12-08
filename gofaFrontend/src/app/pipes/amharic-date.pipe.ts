// src/app/pipes/amharic-date.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import Kenat from 'kenat';

@Pipe({
  name: 'amharicDate'
})
export class AmharicDatePipe implements PipeTransform {
  transform(value: string | Date | null): string {
    if (!value) return 'Unknown Date';
    try {
      const date = typeof value === 'string' ? new Date(value) : value;
      if (isNaN(date.getTime())) return 'Invalid Date';
      const kenat = new Kenat(date);
      const formattedDate = kenat.format({ lang: 'amharic' }); // e.g., "የካቲት 7 2018"
      const [month, day, year] = formattedDate.split(' ');
      return `${month} ${day}, ${year}`; // e.g., "የካቲት 7, 2018"
    } catch (error) {
      console.error('Error formatting Amharic date:', error);
      return 'Unknown Date';
    }
  }
}