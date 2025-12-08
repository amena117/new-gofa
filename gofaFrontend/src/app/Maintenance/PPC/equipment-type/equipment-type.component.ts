import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-equipment-type',
  templateUrl: './equipment-type.component.html',
  styleUrls: ['./equipment-type.component.css']
})
export class EquipmentTypeComponent {
  equipmentType = {
    equipmentTypeName: '',
    equipmentModel: ''
  };
  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    if (!this.equipmentType.equipmentTypeName || !this.equipmentType.equipmentModel) {
      this.errorMessage = 'Please fill in both Equipment Type and Equipment Model.';
      this.successMessage = '';
      return;
    }

    const apiUrl = `${environment.apiBaseUrl}/api/EquipmentTypes`;

    this.http.post(apiUrl, this.equipmentType).subscribe({
      next: (response: any) => {
        this.successMessage = `Successfully added: ${this.equipmentType.equipmentTypeName} - ${this.equipmentType.equipmentModel}`;
        this.errorMessage = '';
        this.equipmentType = { equipmentTypeName: '', equipmentModel: '' };
        this.router.navigate(['/maintenance/equipments']); // Absolute path
      },
      error: (error) => {
        this.errorMessage = 'Failed to add Equipment Type. Please try again.';
        console.error('Error:', error);
      }
    });
  }
}
