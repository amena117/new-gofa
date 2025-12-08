import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Warehouse } from '../../model/warehouse.model'; // Import the Warehouse model
import { WarehouseService } from '../../services/warehouse-service.service'; // Import the WarehouseService

@Component({
  selector: 'app-warehouse',
  templateUrl: './warehouse.component.html',
  styleUrls: ['./warehouse.component.css']
})
export class WarehouseComponent {
  warehouse: Warehouse = {
    warehouseId: '',
    name: '',
    location: '',
    
  };

  isSubmitting = false;

  constructor(
    private router: Router,
    private warehouseService: WarehouseService // Inject the WarehouseService
  ) {}

  /**
   * Handles form submission to create a new warehouse.
   */
  onSubmit() {
    // Validate form fields
    if (!this.warehouse.warehouseId || !this.warehouse.name || !this.warehouse.location) {
      alert('Please fill out all fields correctly.');
      return;
    }

    this.isSubmitting = true; // Disable the form while submitting

    // Call the service to create the warehouse
    this.warehouseService.createWarehouse(this.warehouse).subscribe(
      (response) => {
        console.log('Warehouse created successfully', response);
        this.resetForm(); // Reset the form after successful creation
        this.router.navigate(['/warehouses']); // Redirect to the warehouses list page
      },
      (error) => {
        console.error('Error creating warehouse', error);
        alert('Error creating warehouse. Please check the console.');
        this.isSubmitting = false; // Re-enable the form on error
      }
    );
  }

  /**
   * Resets the form to its initial state.
   */
  resetForm(): void {
    this.warehouse = {
      warehouseId: '',
      name: '',
      location: '',
     
    };
    this.isSubmitting = false; // Ensure the form is not in "submitting" state
  }
}