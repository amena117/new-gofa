import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Shelf } from '../../model/shelf.model';
import { ShelfService } from '../../services/shelf.service';
import { WarehouseService } from '../../services/warehouse-service.service';
import { Warehouse } from '../../model/warehouse.model';

@Component({
  selector: 'app-shelf',
  templateUrl: './shelf.component.html',
  styleUrls: ['./shelf.component.css'],
})
export class ShelfComponent implements OnInit {
  shelf: Shelf = {
    shelfId: 0, // Always number, backend assigns
    name: '',
    column: '',
    row: '',
    warehouseId: ''
  };

  warehouses: Warehouse[] = [];
  isSubmitting = false;

  constructor(
    private router: Router,
    private shelfService: ShelfService,
    private warehouseService: WarehouseService
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data;
        console.log('Warehouses loaded:', this.warehouses);
      },
      error: (error) => {
        console.error('Error loading warehouses:', error);
        alert('Failed to load warehouses. Please try again.');
      }
    });
  }

  onSubmit(): void {
    if (!this.shelf.name || !this.shelf.column || !this.shelf.row || !this.shelf.warehouseId) {
      alert('Please fill out all fields correctly.');
      return;
    }

    this.isSubmitting = true;

    // Omit shelfId from submission since it's auto-incremented
    const { shelfId, ...shelfData } = this.shelf; // Destructure to exclude shelfId

    this.shelfService.createShelf(shelfData).subscribe({
      next: (response) => {
        console.log('Shelf created successfully:', response);
        this.resetForm();
        this.router.navigate(['/shelves']);
      },
      error: (error) => {
        console.error('Error creating shelf:', error);
        alert(`Error creating shelf: ${error.message || 'Unknown error'}`);
        this.isSubmitting = false;
      }
    });
  }

  resetForm(): void {
    this.shelf = {
      shelfId: 0,
      name: '',
      column: '',
      row: '',
      warehouseId: ''
    };
    this.isSubmitting = false;
  }
}