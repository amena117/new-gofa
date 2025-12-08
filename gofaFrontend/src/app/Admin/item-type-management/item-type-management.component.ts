import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';
import { Category } from '../../model/item.model';
import { ApiResponse } from '../../model/model22';

@Component({
  selector: 'app-item-type-management',
  templateUrl: './item-type-management.component.html',
  styleUrls: ['./item-type-management.component.css']
})
export class ItemTypeManagementComponent implements OnInit {
  categories: Category[] = [];
  dataSource = new MatTableDataSource<Category>([]);
  categoryForm: FormGroup;
  editMode = false;
  editingId: number | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserRole: string | null = null;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService,
    private authService: AuthService
  ) {
    this.categoryForm = this.fb.group({
      category: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[a-zA-Z0-9-_ ]+$/)
        ]
      ],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();

    if (!this.canManageCategories()) {
      this.errorMessage = 'Access denied. You do not have permission to manage categories.';
    }

    this.loadCategories();
  }

  canManageCategories(): boolean {
    const allowedRoles = ['SUPER_ADMIN', 'VHF', 'HF', 'ELECTRONICS', 'SPAREPART'];
    return allowedRoles.includes(this.currentUserRole ?? '');
  }

  loadCategories(): void {
    this.itemService.getAllCategories().subscribe({
      next: (categories) => {
        // Filter categories based on role
        if (this.currentUserRole === 'SUPER_ADMIN') {
          this.categories = categories;
        } else {
          this.categories = categories.filter(cat => cat.role === this.currentUserRole);
        }
        this.totalItems = this.categories.length;
        this.updateDataSource();
        this.errorMessage = null;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to load categories';
        console.error('Error loading categories:', err);
      }
    });
  }

  updateDataSource(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.categories.slice(start, end);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDataSource();
    }
  }

  nextPage(): void {
    if (this.currentPage * this.pageSize < this.totalItems) {
      this.currentPage++;
      this.updateDataSource();
    }
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.errorMessage = 'Please correct the errors in the form.';
      return;
    }

    const request = {
      name: this.categoryForm.value.category.trim(),
      description: this.categoryForm.value.description?.trim() || ''
    };

    if (this.editMode && this.editingId !== null) {
      this.updateCategory(request);
    } else {
      this.createCategory(request);
    }
  }

  createCategory(request: { name: string; description: string }): void {
    const userRole = this.currentUserRole || 'Unknown';
    const payload = {
      name: request.name,
      description: request.description,
      role: userRole
    };

    this.itemService.createCategory(payload).subscribe({
      next: (response: ApiResponse<any>) => {
        this.successMessage = response.message || 'Category created successfully';
        this.errorMessage = null;
        this.loadCategories();
        this.resetForm();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to create category';
        this.successMessage = null;
        console.error('Error creating category:', err);
      }
    });
  }

  updateCategory(request: { name: string; description: string }): void {
    if (!this.editingId) return;

    this.itemService.updateCategory(this.editingId, request).subscribe({
      next: (response: ApiResponse<void>) => {
        this.successMessage = response.message || 'Category updated successfully';
        this.errorMessage = null;
        this.loadCategories();
        this.resetForm();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to update category';
        this.successMessage = null;
        console.error('Error updating category:', err);
      }
    });
  }

  editCategory(category: Category): void {
    if (!category.id) {
      this.errorMessage = 'Cannot edit category with no ID.';
      return;
    }

    if (this.currentUserRole !== 'SUPER_ADMIN' && category.role !== this.currentUserRole) {
      this.errorMessage = 'You can only edit categories created by your role.';
      return;
    }

    this.editMode = true;
    this.editingId = category.id;
    this.categoryForm.patchValue({
      category: category.name,
      description: category.description
    });
  }

  deleteCategory(id: number | undefined): void {
    if (!id) {
      this.errorMessage = 'Cannot delete category with no ID.';
      return;
    }

    const category = this.categories.find(c => c.id === id);
    if (!category) return;

    if (this.currentUserRole !== 'SUPER_ADMIN' && category.role !== this.currentUserRole) {
      this.errorMessage = 'You can only delete categories created by your role.';
      return;
    }

    const categoryName = category.name;

    if (confirm(`Are you sure you want to delete '${categoryName}'? This action cannot be undone.`)) {
      this.itemService.deleteCategory(id).subscribe({
        next: (response: ApiResponse<void>) => {
          this.successMessage = response.message || 'Category deleted successfully';
          this.errorMessage = null;
          this.loadCategories();
        },
        error: (err) => {
          this.errorMessage = err.message || 'Failed to delete category';
          this.successMessage = null;
          console.error('Error deleting category:', err);
        }
      });
    }
  }

  resetForm(): void {
    this.categoryForm.reset();
    this.editMode = false;
    this.editingId = null;
    this.errorMessage = null;
    this.successMessage = null;
  }
}