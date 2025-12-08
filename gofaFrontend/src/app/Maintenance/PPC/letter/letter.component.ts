import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { Letter } from '../../Models/letter.model';

@Component({
  selector: 'app-letter',
  templateUrl: './letter.component.html',
  styleUrls: ['./letter.component.css']
})
export class LetterComponent implements OnInit {
  letters: Letter[] = [];
  loading = false;
  error: string | null = null;

  constructor(private maintenanceService: MaintenanceRequestService) {}

  ngOnInit(): void {
    this.loadLetters();
  }

  /** Load all letters */
  loadLetters(): void {
    this.loading = true;
    this.error = null;

    this.maintenanceService.getLetters().subscribe({
      next: (data) => {
        this.letters = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching letters:', err);
        this.error = 'Failed to load letters.';
        this.loading = false;
      }
    });
  }

  /** Delete a letter */
  deleteLetter(id: number): void {
    if (!confirm('Are you sure you want to delete this letter?')) return;

    this.maintenanceService.deleteLetter(id).subscribe({
      next: () => {
        this.letters = this.letters.filter(l => l.letterId !== id);
      },
      error: (err) => {
        console.error('Error deleting letter:', err);
        this.error = 'Failed to delete letter.';
      }
    });
  }
}
