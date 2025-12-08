import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../environments/environment';

@Component({
  selector: 'app-mini-store-bin-card',
  templateUrl: './mini-store-bin-card.component.html',
  styleUrls: ['./mini-store-bin-card.component.css']
})
export class MiniStoreBinCardComponent {
  miniStoreBinCard = {
    stockNumber: 0,
    description: '',
    location: '',
    category: '',
    unitMeasurement: '',
    model: '',
    date: '',
    postedBy: ''
  };

  message: string = '';

  private apiUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard`;

  constructor(private http: HttpClient) {}

  onSubmit() {
    // Validate required fields
    const { stockNumber, description, location, category, unitMeasurement, model, date, postedBy } = this.miniStoreBinCard;
    if (!stockNumber || !description || !location || !category || !unitMeasurement || !model || !date || !postedBy) {
      this.message = 'Please fill in all required fields.';
      return;
    }

    // Ensure StockNumber is numeric
    this.miniStoreBinCard.stockNumber = Number(stockNumber);

    // Format the date as YYYY-MM-DD
    this.miniStoreBinCard.date = new Date(date).toISOString().split('T')[0];

    // Truncate long strings
    this.miniStoreBinCard.unitMeasurement = unitMeasurement.substring(0, 50);
    this.miniStoreBinCard.model = model.substring(0, 100);

    // Log the payload
    console.log('Final request payload:', this.miniStoreBinCard);

    // Send POST request
    this.http.post(this.apiUrl, this.miniStoreBinCard).subscribe({
      next: () => {
        this.message = 'Data saved successfully!';
        this.resetForm();
      },
      error: (error) => {
        console.error('Error details:', error);
        this.message = `Error: ${error.error?.message || 'An unexpected error occurred.'}`;
      }
    });
  }

  resetForm() {
    this.miniStoreBinCard = {
      stockNumber: 0,
      description: '',
      location: '',
      category: '',
      unitMeasurement: '',
      model: '',
      date: '',
      postedBy: ''
    };
  }
}
