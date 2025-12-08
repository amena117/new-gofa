import { Component, OnInit } from '@angular/core';
import { ShelfService } from '../../services/shelf.service';
import { WarehouseService } from '../../services/warehouse-service.service';
import { Shelf } from '../../model/shelf.model';
import { Warehouse } from '../../model/warehouse.model';

@Component({
  selector: 'app-shelf-list',
  templateUrl: './shelf-list.component.html',
  styleUrls: ['./shelf-list.component.css'],
})
export class ShelfListComponent implements OnInit {
  shelves: Shelf[] = [];
  filteredShelves: Shelf[] = [];
  warehouses: Warehouse[] = [];
  selectedWarehouseId: string | null = null;
  isLoading = true;

  constructor(
    private shelfService: ShelfService,
    private warehouseService: WarehouseService
  ) {}

  ngOnInit() {
    this.loadShelves();
    this.loadWarehouses();
  }

  loadShelves(): void {
    this.shelfService.getShelves().subscribe({
      next: (data) => {
        this.shelves = data.map(shelf => ({ ...shelf, isEditing: false })); // Add isEditing flag
        this.filteredShelves = [...this.shelves];
        this.isLoading = false;
        console.log('Shelves loaded:', this.shelves);
      },
      error: (error) => {
        console.error('Error loading shelves:', error);
        this.isLoading = false;
        alert('Failed to load shelves. Please try again.');
      },
    });
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data;
        console.log('Warehouses loaded:', this.warehouses);
      },
      error: (error) => {
        console.error('Error fetching warehouses:', error);
        alert('Failed to load warehouses. Please try again.');
      },
    });
  }

  filterShelves(): void {
    if (this.selectedWarehouseId) {
      this.filteredShelves = this.shelves.filter(
        (shelf) => shelf.warehouseId === this.selectedWarehouseId
      );
    } else {
      this.filteredShelves = [...this.shelves];
    }
    console.log('Filtered shelves:', this.filteredShelves);
  }

  onWarehouseChange(warehouseId: string | null): void {
    this.selectedWarehouseId = warehouseId;
    this.filterShelves();
  }

  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses.find((w) => w.warehouseId === warehouseId);
    return warehouse?.name || 'Unknown';
  }

  startEditing(shelf: Shelf): void {
    shelf.isEditing = true;
    shelf['originalData'] = { ...shelf }; // Store original data for cancel
  }

  saveShelf(shelf: Shelf): void {
    this.shelfService.updateShelf(shelf.shelfId.toString(), shelf).subscribe({
      next: () => {
        shelf.isEditing = false;
        delete shelf['originalData']; // Clean up
        this.loadShelves(); // Reload to ensure data consistency
        console.log('Shelf updated:', shelf.shelfId);
      },
      error: (error) => {
        console.error('Error updating shelf:', error);
        alert('Failed to update shelf. Please try again.');
      },
    });
  }

  cancelEditing(shelf: Shelf): void {
    if (shelf['originalData']) {
      Object.assign(shelf, shelf['originalData']); // Restore original data
      shelf.isEditing = false;
      delete shelf['originalData'];
    }
  }

  deleteShelf(shelf: Shelf): void {
    if (confirm(`Are you sure you want to delete "${shelf.name}"?`)) {
      this.shelfService.deleteShelf(shelf.shelfId.toString()).subscribe({
        next: () => {
          this.shelves = this.shelves.filter((s) => s.shelfId !== shelf.shelfId);
          this.filterShelves();
          console.log('Shelf deleted:', shelf.shelfId);
        },
        error: (error) => {
          console.error('Error deleting shelf:', error);
          alert('Failed to delete shelf. Please try again.');
        },
      });
    }
  }
}