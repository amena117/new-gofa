import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'; // Adjust the path as needed

@Component({
  selector: 'app-view-equipments',
  templateUrl: './view-equipments.component.html',
  styleUrls: ['./view-equipments.component.css']
})
export class ViewEquipmentsComponent implements OnInit {
  equipmentTypes: any[] = []; // To store retrieved data
  errorMessage: string = ''; // To display error messages

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchEquipmentTypes(); // Fetch data when the component initializes
  }

  fetchEquipmentTypes() {
    const apiUrl = `${environment.apiBaseUrl}/api/EquipmentTypes`;

    // Send GET request to fetch all equipment types
    this.http.get<any[]>(apiUrl).subscribe(
      (data) => {
        this.equipmentTypes = data; // Store the retrieved data
        this.errorMessage = ''; // Clear any previous error messages
      },
      (error) => {
        this.errorMessage = 'Failed to fetch Equipment Types. Please try again.';
        console.error('Error fetching Equipment Types:', error);
      }
    );
  }
}