import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ItemService } from '../services/item.service';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { AddItemQuantityRequest, Item, Category, AccessoryRequest, ApiResponse, ShelfDto } from '../model/item.model';
import { Router } from '@angular/router';
import { Observable, of, forkJoin } from 'rxjs';
import { map, startWith, tap, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Kenat from 'kenat';

@Component({
  selector: 'app-add-item-quantity',
  templateUrl: './add-item-quantity.component.html',
  styleUrls: ['./add-item-quantity.component.css']
})
export class AddItemQuantityComponent implements OnInit {
  itemForm: FormGroup;
  bulkForm: FormGroup;
  isBulkMode = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  items: Item[] = [];
  categories: string[] = [];
  currencies: string[] = ['ETB', 'USD', 'EURO', 'POUND'];
  shelves: ShelfDto[] = [];
  filteredItems: Observable<Item[]>;
  filteredBulkItems: Observable<Item[]>[] = [];
  showSerialNumbers = false;
  showAccessories = false;
  showBulkSerialNumbers: boolean[] = [];
  showBulkAccessories: boolean[] = [];
  isLoadingCategories = false;
  isLoadingCurrencies = false;
  isLoadingShelves = false;
  isSearching = false;

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    const firstName = this.authService.getFirstName() || 'Unknown';
    const lastName = this.authService.getLastName() || '';
    const registeredBy = `${firstName} ${lastName}`.trim();
    const userRole = this.authService.getRole() || 'SPAREPART';
    const currentEthiopianDate = this.getCurrentEthiopianDate();

    this.itemForm = this.fb.group({
      search: [''],
      description: ['', Validators.required],
      category: ['', Validators.required],
      shelf: ['', Validators.required],
      itemColumn: ['', Validators.required],
      itemRow: ['', Validators.required],
      condition: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      numOfBox: [''],
      role: [{ value: userRole, disabled: true }, Validators.required],
      model: ['', Validators.required],
      voucherNumber: [''],
      hasVoucherNumber: [false],
      receivedFrom: ['', Validators.required],
      registeredBy: [{ value: registeredBy, disabled: true }, Validators.required],
      warehouseId: [{ value: userRole, disabled: true }, Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      currency: ['ETB', Validators.required],
      transactionDate: [{ value: currentEthiopianDate, disabled: true }],
      serialNumbers: this.fb.array([]),
      accessories: this.fb.array([])
    });

    this.bulkForm = this.fb.group({
      voucherNumber: [''],
      hasVoucherNumber: [false],
      receivedFrom: ['', Validators.required],
      registeredBy: [{ value: registeredBy, disabled: true }, Validators.required],
      transactionDate: [{ value: currentEthiopianDate, disabled: true }],
      items: this.fb.array([])
    });

    this.filteredItems = this.itemForm.get('search')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.isSearching = true),
      switchMap(value => this.searchItems(value || '')),
      tap(() => this.isSearching = false)
    );
  }

  ngOnInit(): void {
    this.isLoadingCategories = true;
this.itemService.getAllCategories().subscribe({
  next: (categories) => {
    // Filter on frontend for safety (SUPER_ADMIN sees all, others only their role)
    const userRole = this.authService.getRole();
    if (userRole === 'SUPER_ADMIN') {
      this.categories = categories.map(c => c.name);
    } else {
      this.categories = categories
        .filter(c => c.role === userRole)
        .map(c => c.name);
    }
    this.isLoadingCategories = false;
  },
  error: (err) => {
    this.errorMessage = 'Failed to load categories. Using default values.';
    this.isLoadingCategories = false;
  }
});

    const warehouseId = this.authService.getRole() || 'SPAREPART';
    this.isLoadingShelves = true;
    this.itemService.getShelvesByWarehouse(warehouseId).subscribe({
      next: (shelves) => {
        this.shelves = shelves;
        this.isLoadingShelves = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load shelves. Please try again.';
        this.isLoadingShelves = false;
      }
    });

    this.isLoadingCurrencies = true;
    this.itemService.getCurrencies().subscribe({
      next: (currencies) => {
        this.currencies = currencies;
        this.isLoadingCurrencies = false;
      },
      error: (err) => {
        this.isLoadingCurrencies = false;
      }
    });

    this.itemService.getItems().subscribe({
      next: (items) => {
        this.items = items;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load items for search.';
      }
    });
  }

  private getCurrentEthiopianDate(): string {
    try {
      const today = new Kenat();
      const formattedDate = today.format({ lang: 'amharic' });
      const [month, day, year] = formattedDate.split(' ');
      return `${month} ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting Ethiopian date:', error);
      return 'Unknown Date';
    }
  }

  private searchItems(value: string): Observable<Item[]> {
    if (!value.trim()) {
      return of([]);
    }
    return this.itemService.getItems(value).pipe(
      map(items => items.filter(item =>
        item.description.toLowerCase().includes(value.toLowerCase()) ||
        item.model.toLowerCase().includes(value.toLowerCase())
      ))
    );
  }

  selectItem(item: Item): void {
  this.itemForm.patchValue({
    description: item.description,
    category: item.category,
    shelf: item.shelf,
    itemColumn: item.itemColumn,
    itemRow: item.itemRow,
    condition: item.condition,
    numOfBox: item.numOfBox || '',
    model: item.model,
    voucherNumber: '',
    hasVoucherNumber: false,
    receivedFrom: '',
    search: '',
    warehouseId: this.authService.getRole() || 'SPAREPART',
    quantity: 1,
    unitPrice: item.unitPrice || 0,
    currency: item.currency || 'ETB'
  });
  this.serialNumbers.clear();
  this.accessories.clear();
  item.accessories.forEach(acc => {
    this.accessories.push(this.fb.group({
      name: [acc.name, Validators.required],
      model: [acc.model, Validators.required],
      quantity: [acc.quantity, [Validators.required, Validators.min(1)]],
      unitPrice: [acc.unitPrice || 0, [Validators.min(0)]],
      currency: [acc.currency || this.currencies[0] || 'ETB']
    }));
  });
  this.updateSerialNumbers();
}

  selectBulkItem(item: Item, index: number): void {
  this.itemsFormArray.at(index).patchValue({
    description: item.description,
    category: item.category,
    shelf: item.shelf,
    itemColumn: item.itemColumn,
    itemRow: item.itemRow,
    condition: item.condition,
    numOfBox: item.numOfBox || '',
    model: item.model,
    search: '',
    warehouseId: this.authService.getRole() || 'SPAREPART',
    quantity: 1,
    unitPrice: item.unitPrice || 0,
    currency: item.currency || 'ETB'
  });
  this.getSerialNumbersForItem(index).clear();
  this.getAccessoriesForItem(index).clear();
  item.accessories.forEach(acc => {
    this.getAccessoriesForItem(index).push(this.fb.group({
      name: [acc.name, Validators.required],
      model: [acc.model, Validators.required],
      quantity: [acc.quantity, [Validators.required, Validators.min(1)]],
      unitPrice: [acc.unitPrice || 0, [Validators.min(0)]],
      currency: [acc.currency || this.currencies[0] || 'ETB']
    }));
  });
  this.updateBulkSerialNumbers(index);
}

  get serialNumbers(): FormArray {
    return this.itemForm.get('serialNumbers') as FormArray;
  }

  get accessories(): FormArray {
    return this.itemForm.get('accessories') as FormArray;
  }

  get itemsFormArray(): FormArray {
    return this.bulkForm.get('items') as FormArray;
  }

  getSerialNumberAt(index: number): FormControl {
    return this.serialNumbers.at(index) as FormControl;
  }

  getAccessoryGroupAt(index: number): FormGroup {
    return this.accessories.at(index) as FormGroup;
  }

  getItemGroupAt(index: number): FormGroup {
    return this.itemsFormArray.at(index) as FormGroup;
  }

  getSerialNumbersForItem(index: number): FormArray {
    return this.itemsFormArray.at(index).get('serialNumbers') as FormArray;
  }

  getAccessoriesForItem(index: number): FormArray {
    return this.itemsFormArray.at(index).get('accessories') as FormArray;
  }

  getSerialNumberForItem(itemIndex: number, serialIndex: number): FormControl {
    return this.getSerialNumbersForItem(itemIndex).at(serialIndex) as FormControl;
  }

  getAccessoryForItem(itemIndex: number, accessoryIndex: number): FormGroup {
    return this.getAccessoriesForItem(itemIndex).at(accessoryIndex) as FormGroup;
  }

  addSerialNumber(): void {
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    if (role === 'SPAREPART' && this.serialNumbers.length < 2) {
      this.serialNumbers.push(this.fb.control('', Validators.required));
    }
  }

  removeSerialNumber(index: number): void {
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    if (role === 'SPAREPART') {
      this.serialNumbers.removeAt(index);
    }
  }

  addAccessory(): void {
  const defaultCurrency = this.currencies[0] || 'ETB';
  this.accessories.push(this.fb.group({
    name: ['', Validators.required],
    model: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.min(0)]], // Optional, with validation
    currency: [defaultCurrency] // Optional, with default
  }));
}

  removeAccessory(index: number): void {
    this.accessories.removeAt(index);
  }

  addSerialNumberToItem(itemIndex: number): void {
    const role = this.itemsFormArray.at(itemIndex).get('role')?.value || 'SPAREPART';
    const serials = this.getSerialNumbersForItem(itemIndex);
    if (role === 'SPAREPART' && serials.length < 2) {
      serials.push(this.fb.control('', Validators.required));
    }
  }

  removeSerialNumberFromItem(itemIndex: number, serialIndex: number): void {
    const role = this.itemsFormArray.at(itemIndex).get('role')?.value || 'SPAREPART';
    if (role === 'SPAREPART') {
      this.getSerialNumbersForItem(itemIndex).removeAt(serialIndex);
    }
  }

  addAccessoryToItem(index: number): void {
  const defaultCurrency = this.currencies[0] || 'ETB';
  this.getAccessoriesForItem(index).push(this.fb.group({
    name: ['', Validators.required],
    model: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.min(0)]], // Optional, with validation
    currency: [defaultCurrency] // Optional, with default
  }));
}

  removeAccessoryFromItem(itemIndex: number, accessoryIndex: number): void {
    this.getAccessoriesForItem(itemIndex).removeAt(accessoryIndex);
  }

  toggleSerialNumbers(): void {
    this.showSerialNumbers = !this.showSerialNumbers;
  }

  toggleAccessories(): void {
    this.showAccessories = !this.showAccessories;
  }

  toggleBulkSerialNumbers(index: number): void {
    this.showBulkSerialNumbers[index] = !this.showBulkSerialNumbers[index];
  }

  toggleBulkAccessories(index: number): void {
    this.showBulkAccessories[index] = !this.showBulkAccessories[index];
  }

  toggleMode(): void {
    this.isBulkMode = !this.isBulkMode;
    this.errorMessage = null;
    this.successMessage = null;
    this.resetSingleForm();
    this.resetBulkForm();
  }

  addBulkItem(): void {
    const userRole = this.authService.getRole() || 'SPAREPART';
    const currentEthiopianDate = this.getCurrentEthiopianDate();
    const firstName = this.authService.getFirstName() || 'Unknown';
    const lastName = this.authService.getLastName() || '';
    const registeredBy = `${firstName} ${lastName}`.trim();
    const itemGroup = this.fb.group({
      search: [''],
      description: ['', Validators.required],
      category: ['', Validators.required],
      shelf: ['', Validators.required],
      itemColumn: ['', Validators.required],
      itemRow: ['', Validators.required],
      condition: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      numOfBox: [''],
      role: [{ value: userRole, disabled: true }, Validators.required],
      model: ['', Validators.required],
      registeredBy: [{ value: registeredBy, disabled: true }, Validators.required],
      warehouseId: [{ value: userRole, disabled: true }, Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      currency: ['ETB', Validators.required],
      transactionDate: [{ value: currentEthiopianDate, disabled: true }],
      serialNumbers: this.fb.array([]),
      accessories: this.fb.array([])
    });
    this.itemsFormArray.push(itemGroup);
    this.showBulkSerialNumbers.push(false);
    this.showBulkAccessories.push(false);
    this.filteredBulkItems.push(
      itemGroup.get('search')!.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.isSearching = true),
        switchMap(value => this.searchItems(value || '')),
        tap(() => this.isSearching = false)
      )
    );
  }

  removeBulkItem(index: number): void {
    this.itemsFormArray.removeAt(index);
    this.showBulkSerialNumbers.splice(index, 1);
    this.showBulkAccessories.splice(index, 1);
    this.filteredBulkItems.splice(index, 1);
  }

  createCategoryIfNotExists(categoryName: string, description: string = ''): Observable<ApiResponse<Category>> {
  const userRole = this.authService.getRole() || 'Unknown';
  return this.itemService.createCategory({
    name: categoryName,
    description,
    role: userRole // ✅ Use real role
  });
}

  onSubmit(): void {
    this.itemForm.markAllAsTouched();
    if (this.itemForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    const quantity = this.itemForm.get('quantity')?.value || 0;
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    const category = this.itemForm.get('category')?.value;
    const warehouseId = this.itemForm.get('warehouseId')?.value;

    this.itemService.getWarehouses().subscribe({
      next: (warehouses) => {
        if (!warehouses.some(w => w.warehouseId === warehouseId)) {
          this.errorMessage = `Warehouse with ID ${warehouseId} does not exist.`;
          return;
        }

        if (quantity > 0) {
          if (role === 'SPAREPART' && this.serialNumbers.length > 2) {
            this.errorMessage = 'SPAREPART items can have up to 2 serial numbers.';
            return;
          }
          if (role !== 'SPAREPART' && this.serialNumbers.length !== quantity) {
            this.errorMessage = 'Non-SPAREPART items must have serial numbers equal to quantity.';
            return;
          }
          if (this.serialNumbers.controls.some(control => !control.value || !control.value.trim())) {
            this.errorMessage = 'All serial number fields must be filled.';
            return;
          }
        }

        this.itemService.getCategories().subscribe({
          next: (categories) => {
            if (!categories.includes(category)) {
              this.createCategoryIfNotExists(category, `Category for ${category}`).subscribe({
                next: () => this.submitItem(),
                error: (err) => this.errorMessage = `Failed to create category: ${err.message}`
              });
            } else {
              this.submitItem();
            }
          },
          error: (err) => this.errorMessage = `Failed to fetch categories: ${err.message}`
        });
      },
      error: (err) => this.errorMessage = `Failed to validate warehouse: ${err.message}`
    });
  }

  private submitItem(): void {
    this.itemForm.get('registeredBy')?.enable();
    this.itemForm.get('warehouseId')?.enable();
    this.itemForm.get('role')?.enable();
    this.itemForm.get('transactionDate')?.enable();

    const request: AddItemQuantityRequest = {
      ...this.itemForm.getRawValue(),
      voucherNumber: this.itemForm.get('hasVoucherNumber')?.value ? this.itemForm.get('voucherNumber')?.value : null,
      numOfBox: this.itemForm.get('numOfBox')?.value ? parseInt(this.itemForm.get('numOfBox')?.value, 10) : null,
      serialNumbers: this.serialNumbers.value,
      transactionDate: this.itemForm.get('transactionDate')?.value,
      accessories: this.accessories.value
    };

    this.itemService.addItemQuantity(request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.errorMessage = null;
        this.resetSingleForm();

        setTimeout(() => {
          this.router.navigate(['/items'], { state: { refresh: true } });
        }, 500);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detailedMessage || err.error?.message || 'An error occurred while adding the item.';
        this.itemForm.get('registeredBy')?.disable();
        this.itemForm.get('warehouseId')?.disable();
        this.itemForm.get('role')?.disable();
        this.itemForm.get('transactionDate')?.disable();
      }
    });
  }

  onBulkSubmit(): void {
    this.bulkForm.markAllAsTouched();
    this.itemsFormArray.controls.forEach(control => control.markAllAsTouched());
    if (this.bulkForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    const categoriesToCheck = this.itemsFormArray.controls.map(control => control.get('category')?.value);
    const uniqueCategories = [...new Set(categoriesToCheck)];

    this.itemService.getCategories().subscribe({
      next: (existingCategories) => {
        const missingCategories = uniqueCategories.filter(cat => !existingCategories.includes(cat));
        if (missingCategories.length > 0) {
          const createCategoryObservables = missingCategories.map(cat =>
            this.createCategoryIfNotExists(cat, `Category for ${cat}`)
          );
          forkJoin(createCategoryObservables).subscribe({
            next: () => this.submitBulkItems(),
            error: (err) => this.errorMessage = `Failed to create categories: ${err.message}`
          });
        } else {
          this.submitBulkItems();
        }
      },
      error: (err) => this.errorMessage = `Failed to fetch categories: ${err.message}`
    });
  }

  private submitBulkItems(): void {
    for (let i = 0; i < this.itemsFormArray.length; i++) {
      const item = this.getItemGroupAt(i);
      const quantity = item.get('quantity')?.value || 0;
      const role = item.get('role')?.value || 'SPAREPART';
      const serials = this.getSerialNumbersForItem(i);
      const warehouseId = item.get('warehouseId')?.value;

      if (quantity > 0) {
        if (role === 'SPAREPART' && serials.length > 2) {
          this.errorMessage = `SPAREPART items can have up to 2 serial numbers for item ${i + 1}.`;
          return;
        }
        if (role !== 'SPAREPART' && serials.length !== quantity) {
          this.errorMessage = `Non-SPAREPART items must have serial numbers equal to quantity for item ${i + 1}.`;
          return;
        }
        if (serials.controls.some(control => !control.value || !control.value.trim())) {
          this.errorMessage = `All serial number fields for item ${i + 1} must be filled.`;
          return;
        }
      }
    }

    this.bulkForm.get('registeredBy')?.enable();
    this.itemsFormArray.controls.forEach(control => {
      control.get('role')?.enable();
      control.get('registeredBy')?.enable();
      control.get('transactionDate')?.enable();
      control.get('warehouseId')?.enable();
    });

    const firstName = this.authService.getFirstName() || 'Unknown';
    const lastName = this.authService.getLastName() || '';
    const registeredBy = `${firstName} ${lastName}`.trim();

    const bulkRequest: any = {
      voucherNumber: this.bulkForm.get('hasVoucherNumber')?.value ? this.bulkForm.get('voucherNumber')?.value : null,
      receivedFrom: this.bulkForm.getRawValue().receivedFrom,
      registeredBy,
      transactionDate: this.bulkForm.get('transactionDate')?.value,
      performedBy: registeredBy,
      items: this.itemsFormArray.getRawValue().map((item: any) => ({
        ...item,
        voucherNumber: item.hasVoucherNumber ? item.voucherNumber : null,
        numOfBox: item.numOfBox ? parseInt(item.numOfBox, 10) : null,
        serialNumbers: item.serialNumbers,
        transactionDate: item.transactionDate,
        accessories: item.accessories
      }))
    };

    this.itemService.bulkAddItemQuantity(bulkRequest).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.errorMessage = null;
        this.resetBulkForm();

        setTimeout(() => {
          this.router.navigate(['/items'], { state: { refresh: true } });
        }, 500);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detailedMessage || err.error?.message || 'An error occurred while adding bulk items.';
        this.resetBulkFormControls();
      }
    });
  }

  updateSerialNumbers(): void {
    const quantity = this.itemForm.get('quantity')?.value || 0;
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    const serials = this.serialNumbers;

    if (role !== 'SPAREPART') {
      while (serials.length < quantity) {
        serials.push(this.fb.control('', Validators.required));
      }
      while (serials.length > quantity) {
        serials.removeAt(serials.length - 1);
      }
    } else {
      while (serials.length > 2) {
        serials.removeAt(serials.length - 1);
      }
    }
  }

  updateBulkSerialNumbers(index: number): void {
    const quantity = this.itemsFormArray.at(index).get('quantity')?.value || 0;
    const role = this.itemsFormArray.at(index).get('role')?.value || 'SPAREPART';
    const serials = this.getSerialNumbersForItem(index);

    if (role !== 'SPAREPART') {
      while (serials.length < quantity) {
        serials.push(this.fb.control('', Validators.required));
      }
      while (serials.length > quantity) {
        serials.removeAt(serials.length - 1);
      }
    } else {
      while (serials.length > 2) {
        serials.removeAt(serials.length - 1);
      }
    }
  }

  public resetSingleForm(): void {
    const currentEthiopianDate = this.getCurrentEthiopianDate();
    const userRole = this.authService.getRole() || 'SPAREPART';
    const firstName = this.authService.getFirstName() || 'Unknown';
    const lastName = this.authService.getLastName() || '';
    const registeredBy = `${firstName} ${lastName}`.trim();

    this.itemForm.reset();
    this.itemForm.patchValue({
      registeredBy,
      warehouseId: userRole,
      role: userRole,
      transactionDate: currentEthiopianDate,
      quantity: 1,
      unitPrice: 0,
      currency: 'ETB',
      hasVoucherNumber: false
    });

    this.itemForm.get('registeredBy')?.disable();
    this.itemForm.get('warehouseId')?.disable();
    this.itemForm.get('role')?.disable();
    this.itemForm.get('transactionDate')?.disable();

    this.serialNumbers.clear();
    this.accessories.clear();
    this.showSerialNumbers = false;
    this.showAccessories = false;
  }

  public resetBulkForm(): void {
    const currentEthiopianDate = this.getCurrentEthiopianDate();
    const firstName = this.authService.getFirstName() || 'Unknown';
    const lastName = this.authService.getLastName() || '';
    const registeredBy = `${firstName} ${lastName}`.trim();

    this.bulkForm.reset();
    this.bulkForm.get('registeredBy')?.setValue(registeredBy);
    this.bulkForm.get('registeredBy')?.disable();
    this.bulkForm.get('transactionDate')?.setValue(currentEthiopianDate);
    this.bulkForm.get('transactionDate')?.disable();
    this.bulkForm.get('hasVoucherNumber')?.setValue(false);
    this.itemsFormArray.clear();
    this.showBulkSerialNumbers = [];
    this.showBulkAccessories = [];
    this.filteredBulkItems = [];
  }

  private resetBulkFormControls(): void {
    this.bulkForm.get('registeredBy')?.disable();
    this.itemsFormArray.controls.forEach(control => {
      control.get('role')?.disable();
      control.get('registeredBy')?.disable();
      control.get('transactionDate')?.disable();
      control.get('warehouseId')?.disable();
    });
  }
}