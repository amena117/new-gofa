import { Component, OnInit } from '@angular/core';
import { WarehouseService } from '../../services/warehouse-service.service';
import { Warehouse } from '../../model/warehouse.model';

@Component({
  selector: 'app-warehouse-list',
  templateUrl: './warehouse-list.component.html',
  styleUrls: ['./warehouse-list.component.css']
})
export class WarehouseListComponent implements OnInit {
  warehouses: Warehouse[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private warehouseService: WarehouseService) {}

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe(
      (data: Warehouse[]) => {
        this.warehouses = data.map(warehouse => ({ ...warehouse, isEditing: false })); // Add isEditing flag
        this.isLoading = false;
        this.error = null;
        console.log('Warehouses loaded:', this.warehouses);
      },
      (error) => {
        console.error('Error fetching warehouses:', error);
        this.error = 'Failed to load warehouses. Please try again later.';
        this.isLoading = false;
      }
    );
  }

  startEditing(warehouse: Warehouse): void {
    warehouse.isEditing = true;
    warehouse['originalData'] = { ...warehouse }; // Store original data for cancel
  }

  saveWarehouse(warehouse: Warehouse): void {
    this.warehouseService.updateWarehouse(warehouse.warehouseId, warehouse).subscribe({
      next: () => {
        warehouse.isEditing = false;
        delete warehouse['originalData']; // Clean up
        this.loadWarehouses(); // Reload to ensure data consistency
        console.log('Warehouse updated:', warehouse.warehouseId);
      },
      error: (error) => {
        console.error('Error updating warehouse:', error);
        alert('Failed to update warehouse. Please try again.');
      }
    });
  }

  cancelEditing(warehouse: Warehouse): void {
    if (warehouse['originalData']) {
      Object.assign(warehouse, warehouse['originalData']); // Restore original data
      warehouse.isEditing = false;
      delete warehouse['originalData'];
    }
  }

  onDelete(warehouseId: string): void {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      this.warehouseService.deleteWarehouse(warehouseId).subscribe({
        next: () => {
          this.loadWarehouses(); // Reload after deletion
        },
        error: (error) => {
          console.error('Error deleting warehouse:', error);
          alert('Failed to delete warehouse. Please try again.');
        }
      });
    }
  }
}