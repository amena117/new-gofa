import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WarehouseService } from '../../services/warehouse-service.service'; // Adjust the path as needed
import { Warehouse } from '../../model/warehouse.model'; // Adjust the path as needed

@Component({
  selector: 'app-edit-warehouse',
  templateUrl: './edit-warehouse.component.html',
  styleUrls: ['./edit-warehouse.component.css']
})
export class EditWarehouseComponent implements OnInit {
  warehouse: Warehouse | null = null; // The warehouse to be edited
  isLoading = true; // Loading state
  error: string | null = null; // Error state
  successMessage: string | null = null; // Success message after update

  constructor(
    private warehouseService: WarehouseService,
    private route: ActivatedRoute,
    private router: Router
  ) {} // Inject necessary services

  ngOnInit(): void {
    this.loadWarehouse(); // Load the warehouse details on initialization
  }

  /**
   * Loads the warehouse details using the ID from the route parameter.
   */
  loadWarehouse(): void {
    const id = this.route.snapshot.paramMap.get('id'); // Get the warehouse ID from the route
    if (id) {
      this.warehouseService.getWarehouseById(id).subscribe(
        (data: Warehouse) => {
          this.warehouse = data; // Store the fetched warehouse
          this.isLoading = false; // Stop loading state
          this.error = null; // Clear any previous errors
        },
        (error) => {
          console.error('Error fetching warehouse:', error);
          this.error = 'Failed to load warehouse. Please try again later.';
          this.isLoading = false; // Stop loading state
        }
      );
    } else {
      this.error = 'Invalid warehouse ID.';
      this.isLoading = false;
    }
  }

  /**
   * Handles the form submission to update the warehouse.
   */
  onSubmit(): void {
    if (!this.warehouse) {
      this.error = 'Warehouse data is not available.';
      return;
    }

    this.warehouseService.updateWarehouse(this.warehouse.warehouseId!, this.warehouse).subscribe(
      () => {
        this.successMessage = 'Warehouse updated successfully!';
        this.error = null; // Clear any previous errors
        setTimeout(() => {
          this.router.navigate(['/warehouses']); // Navigate back to the warehouse list
        }, 2000); // Redirect after 2 seconds
      },
      (error) => {
        console.error('Error updating warehouse:', error);
        this.error = 'Failed to update warehouse. Please try again.';
      }
    );
  }

  /**
   * Navigates back to the warehouse list page.
   */
  onCancel(): void {
    this.router.navigate(['/warehouses']); // Navigate back to the warehouse list
  }
}