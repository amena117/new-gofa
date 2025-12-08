import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { environment } from './../../../../environments/environment';

@Component({
  selector: 'app-update-mini-store-bin-card',
  templateUrl: './update-mini-store-bin-card.component.html',
  styleUrls: ['./update-mini-store-bin-card.component.css']
})
export class UpdateMiniStoreBinCardComponent implements OnInit {

  miniStoreBinCard = {
    id: 0,
    stockNumber: 0,
    description: '',
    location: '',
    category: '',
    unitMeasurement: '',
    model: '',
    date: '',
    postedBy: '',
    recievedFrom: '',
    quantityRecieved: 0,
    balance: 0
  };

  quantity: number = 0;
  message: string = '';
  serialNumbers: string[] = [];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private location: Location
  ) {}
  
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? +idParam : null;
    if (id) this.fetchItem(id);
  }

  fetchItem(id: number) {
    this.http.get<any>(`${environment.apiBaseUrl}/api/MiniStoreBinCard/${id}`)
      .subscribe({
        next: (data) => {
          if (data.date) data.date = new Date(data.date).toISOString().split('T')[0];
          this.miniStoreBinCard = data;
        },
        error: (err) => {
          console.error('Failed to load bin card data:', err);
          this.message = 'Failed to load bin card data.';
        }
      });
  }

  onQuantityChange() {
    this.serialNumbers = Array(this.quantity).fill('');
  }

  updateSerialNumber(index: number, value: string) {
    this.serialNumbers[index] = value;
  }

  isAllSerialsFilled(): boolean {
    return this.serialNumbers.every(sn => sn.trim() !== '');
  }

  onReceive() {
    if (!this.miniStoreBinCard.stockNumber || !this.miniStoreBinCard.model || !this.quantity || !this.miniStoreBinCard.recievedFrom) {
      this.message = 'Please fill in all required fields.';
      return;
    }

    if (this.quantity <= 0) {
      this.message = 'Quantity should be greater than zero.';
      return;
    }

    if (!this.isAllSerialsFilled()) {
      this.message = 'Please enter all serial numbers.';
      return;
    }

    const checkStockUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard/check-stock/${this.miniStoreBinCard.stockNumber}`;
    this.http.get<any>(checkStockUrl).subscribe({
      next: (response) => {
        if (response.exists) this.submitData();
        else this.message = 'No MiniStore Bin Card found for this Stock Number.';
      },
      error: (err) => {
        console.error('Error checking stock number:', err);
        this.message = 'Error checking stock number.';
      }
    });
  }

  submitData() {
    const currentDate = new Date().toISOString();

    const serialData = this.serialNumbers.map(sn => ({
      serialNumber: sn,
      status: 'Available in stock',
      inDate: currentDate
    }));

    const payload = {
      stockNumber: this.miniStoreBinCard.stockNumber.toString(),
      model: this.miniStoreBinCard.model,
      date: currentDate,
      recievedFrom: this.miniStoreBinCard.recievedFrom,
      quantityRecieved: this.quantity,
      serialNumbers: serialData
    };

    const updateApiUrl = `${environment.apiBaseUrl}/api/MiniStoreBinCard/recieve-spare`;
    this.http.put(updateApiUrl, payload).subscribe({
      next: () => {
        this.message = 'Data saved successfully and serial numbers registered!';
        setTimeout(() => this.location.back(), 1500);
      },
      error: (err) => {
        console.error('Error saving data:', err);
        this.message = 'Error saving data.';
      }
    });
  }

  resetForm() {
    this.miniStoreBinCard = {
      id: 0,
      stockNumber: 0,
      description: '',
      location: '',
      category: '',
      unitMeasurement: '',
      model: '',
      date: '',
      postedBy: '',
      recievedFrom: '',
      quantityRecieved: 0,
      balance: 0
    };
    this.quantity = 0;
    this.serialNumbers = [];
  }
onSerialNumberChange(index: number): void {
  const value = this.serialNumbers[index]?.trim() || '';

  // Example: prevent duplicate serial numbers
  if (this.serialNumbers.filter(sn => sn === value).length > 1) {
    this.message = `Duplicate serial number detected: ${value}`;
  } else {
    this.message = '';
  }

  // Ensure the updated value is saved
  this.serialNumbers[index] = value;
}

  trackByIndex(index: number): number {
    return index;
  }
}
