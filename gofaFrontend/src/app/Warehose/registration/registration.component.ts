import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ItemService } from '../../services/item.service';
import { AuthService } from '../../services/auth.service';
import { ItemReceiveRequest, BulkReceiveRequest, Item, ShelfDto, WarehouseDto } from '../../model/item.model';
import { Router } from '@angular/router';
import Kenat from 'kenat';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit, OnDestroy {
  itemForm: FormGroup;
  bulkForm: FormGroup;
  isBulkMode = false;
  applyReceivedFromToAll = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  categories: string[] = [];
  currencies: string[] = [];
  sources: string[] = [];
  isLoadingCategories = true;
  isLoadingCurrencies = true;
  isLoadingSources = true;
  warehouses: WarehouseDto[] = [];
  shelves: ShelfDto[] = [];
  selectedWarehouse: string | null = null;
  isLoadingShelves = false;
  showSerialNumbers = false;
  showAccessories = false;
  showBulkSerialNumbers: boolean[] = [];
  showBulkAccessories: boolean[] = [];

  private subscriptions: any[] = []; // For cleanup if needed

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) {
    const currentUser = this.authService.getCurrentUser();
    const registeredBy = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.username || 'Unknown';
    const userRole = this.authService.getRole() || 'SPAREPART';
    const currentEthiopianDate = this.getCurrentEthiopianDate();

    this.itemForm = this.fb.group({
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
      source: ['', Validators.required],
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
      source: ['', Validators.required],
      registeredBy: [{ value: registeredBy, disabled: true }, Validators.required],
      transactionDate: [{ value: currentEthiopianDate, disabled: true }],
      items: this.fb.array([])
    });

    // Apply FOC logic to initial itemForm
    this.enforceFOCUnitPrice(this.itemForm);
  }

  ngOnInit(): void {
    // Load categories
    this.itemService.getAllCategories().subscribe({
      next: (categories) => {
        const userRole = this.authService.getRole();
        if (userRole === 'SUPER_ADMIN') {
          this.categories = categories.map(c => c.name);
        } else {
          this.categories = categories
            .filter(c => c.role === userRole)
            .map(c => c.name);
        }
        this.isLoadingCategories = false;
        console.log('Loaded categories:', this.categories);
      },
      error: (err) => {
        this.errorMessage = 'Failed to load categories: ' + err.message;
        this.isLoadingCategories = false;
        console.error('Error loading categories:', err);
      }
    });

    // Load currencies
    this.itemService.getCurrencies().subscribe({
      next: (currencies) => {
        this.currencies = currencies;
        this.isLoadingCurrencies = false;
        const defaultCurrency = this.currencies[0] || 'ETB';
        this.itemForm.patchValue({ currency: defaultCurrency });
        this.bulkForm.get('items')?.value?.forEach((_: any, i: number) => {
          this.items.at(i).patchValue({ currency: defaultCurrency });
        });
        console.log('Loaded currencies:', currencies);
      },
      error: (err) => {
        this.errorMessage = 'Failed to load currencies: ' + err.message;
        this.isLoadingCurrencies = false;
        console.error('Error loading currencies:', err);
      }
    });

    // Load sources
    this.itemService.getSources().subscribe({
      next: (sources) => {
        this.sources = sources;
        this.isLoadingSources = false;
        const defaultSource = this.sources[0] || 'Purchase';
        this.itemForm.patchValue({ source: defaultSource });
        this.bulkForm.patchValue({ source: defaultSource });
        console.log('Loaded sources:', sources);
      },
      error: (err) => {
        this.errorMessage = 'Failed to load sources: ' + err.message;
        this.isLoadingSources = false;
        console.error('Error loading sources:', err);
      }
    });

    // Load warehouses
    const userRole = this.authService.getRole();
    if (userRole) {
      this.itemService.getWarehouses().subscribe({
        next: (warehouses) => {
          this.warehouses = warehouses.filter(w => w.warehouseId === userRole);
          if (this.warehouses.length > 0) {
            this.selectedWarehouse = this.warehouses[0].warehouseId;
            this.loadShelves(this.selectedWarehouse);
          } else {
            this.errorMessage = `No warehouse found for role ${userRole}. Please contact an administrator.`;
            console.error('No warehouse found for role:', userRole);
          }
        },
        error: (err) => {
          this.errorMessage = 'Failed to load warehouses: ' + err.message;
          console.error('Error loading warehouses:', err);
        }
      });
    } else {
      this.errorMessage = 'User role not found. Please log in again.';
      console.error('User role not found');
    }

    // Handle navigation state
    const navigation = this.router.getCurrentNavigation();
    const item = navigation?.extras.state?.['item'] as Item;
    if (item) {
      const category = typeof item.category === 'object' ? (item.category as any).name : item.category;
      const currency = this.currencies.includes(item.currency) ? item.currency : this.currencies[0] || 'ETB';
      this.itemForm.patchValue({
        description: item.description,
        category,
        shelf: item.shelf,
        itemColumn: item.itemColumn,
        itemRow: item.itemRow,
        condition: item.condition,
        numOfBox: item.numOfBox || '',
        model: item.model,
        voucherNumber: item.voucherNumber || '',
        hasVoucherNumber: !!item.voucherNumber,
        receivedFrom: item.receivedFrom,
        source: item.source || this.sources[0] || 'Purchase',
        warehouseId: item.warehouseId || this.authService.getRole() || 'SPAREPART',
        quantity: 1,
        unitPrice: item.unitPrice || 0,
        currency,
        transactionDate: this.getCurrentEthiopianDate()
      });
      this.enforceFOCUnitPrice(this.itemForm); // Re-apply FOC logic after patch
      this.accessories.clear();
      item.accessories.forEach(a => {
        this.accessories.push(this.fb.group({
          name: [a.name, Validators.required],
          model: [a.model, Validators.required],
          quantity: [a.quantity, [Validators.required, Validators.min(1)]]
        }));
      });
      if (item.warehouseId) {
        this.loadShelves(item.warehouseId);
      }
    }
  }

  ngOnDestroy(): void {
    // In a production app, you'd unsubscribe from valueChanges here
    // For simplicity and since forms are short-lived, we skip it
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

  // ✅ FOC Enforcement Logic
  private enforceFOCUnitPrice(formGroup: FormGroup): void {
    const currencyControl = formGroup.get('currency');
    const unitPriceControl = formGroup.get('unitPrice');

    if (!currencyControl || !unitPriceControl) return;

    const updateUnitPrice = () => {
      if (currencyControl.value === 'FOC') {
        unitPriceControl.setValue(0, { emitEvent: false });
        unitPriceControl.disable({ emitEvent: false });
      } else {
        unitPriceControl.enable({ emitEvent: false });
      }
    };

    // Set initial state
    updateUnitPrice();

    // React to future changes
    currencyControl.valueChanges.subscribe(() => {
      updateUnitPrice();
    });
  }

  loadShelves(warehouseId: string): void {
    this.isLoadingShelves = true;
    this.itemService.getShelvesByWarehouse(warehouseId).subscribe({
      next: (shelves) => {
        this.shelves = shelves;
        this.isLoadingShelves = false;
        console.log('Loaded shelves:', shelves);
      },
      error: (err) => {
        this.errorMessage = 'Failed to load shelves: ' + err.message;
        this.isLoadingShelves = false;
        console.error('Error loading shelves:', err);
      }
    });
  }

  debugFormErrors(): void {
    this.bulkForm.markAllAsTouched();
    this.items.controls.forEach(control => control.markAllAsTouched());

    console.log('=== Bulk Form Debug Info ===');
    console.log('bulkForm valid:', this.bulkForm.valid);
    console.log('bulkForm value:', JSON.stringify(this.bulkForm.getRawValue(), null, 2));
    console.log('bulkForm errors:', this.bulkForm.errors);

    Object.keys(this.bulkForm.controls).forEach(key => {
      const control = this.bulkForm.get(key);
      if (control?.invalid) {
        console.log(`Field ${key} is invalid:`, control.errors);
      }
    });

    this.items.controls.forEach((item, index) => {
      console.log(`--- Item ${index + 1} ---`);
      console.log(`Item ${index + 1} valid:`, item.valid);
      console.log(`Item ${index + 1} value:`, JSON.stringify(item.getRawValue(), null, 2));
      console.log(`Item ${index + 1} errors:`, item.errors);
      Object.keys((item as FormGroup).controls).forEach(field => {
        const control = item.get(field);
        if (control?.invalid) {
          console.log(`Item ${index + 1} field ${field} is invalid:`, control.errors);
        }
      });

      const quantity = item.get('quantity')?.value || 0;
      const role = item.get('role')?.value || 'SPAREPART';
      const serials = this.getSerialNumbersForItem(index);
      if (role !== 'SPAREPART') {
        console.log(`Item ${index + 1} serial numbers (expected ${quantity}):`, serials.value);
        if (serials.length !== quantity) {
          console.log(`Item ${index + 1} error: Serial numbers (${serials.length}) do not match quantity (${quantity})`);
        }
        if (serials.controls.some(control => !control.value || control.value.trim() === '')) {
          console.log(`Item ${index + 1} error: Some serial numbers are empty`);
        }
      }

      const accessories = this.getAccessoriesForItem(index);
      console.log(`Item ${index + 1} accessories:`, accessories.value);
      accessories.controls.forEach((acc, accIndex) => {
        if (acc.invalid) {
          console.log(`Item ${index + 1} accessory ${accIndex + 1} is invalid:`, acc.errors);
        }
      });
    });

    console.log('Sources available:', this.sources);
    console.log('Categories available:', this.categories);
    console.log('Shelves available:', this.shelves);
    console.log('Warehouses available:', this.warehouses);
    console.log('=== End Bulk Form Debug Info ===');
  }

  onWarehouseChange(event: Event): void {
    const warehouseId = (event.target as HTMLSelectElement).value;
    this.selectedWarehouse = warehouseId;
    this.itemForm.patchValue({ warehouseId, shelf: '' });
    this.loadShelves(warehouseId);
  }

  get serialNumbers(): FormArray {
    return this.itemForm.get('serialNumbers') as FormArray;
  }

  get accessories(): FormArray {
    return this.itemForm.get('accessories') as FormArray;
  }

  get items(): FormArray {
    return this.bulkForm.get('items') as FormArray;
  }

  addSerialNumber(): void {
    this.serialNumbers.push(this.fb.control('', Validators.required));
  }

  removeSerialNumber(index: number): void {
    this.serialNumbers.removeAt(index);
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

  addBulkItem(): void {
    const userRole = this.authService.getRole() || 'SPAREPART';
    const currentEthiopianDate = this.getCurrentEthiopianDate();
    const currentUser = this.authService.getCurrentUser();
    const registeredBy = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.username || 'Unknown';
    const warehouseId = this.selectedWarehouse || this.warehouses[0]?.warehouseId || 'SPAREPART';
    const defaultCurrency = this.currencies[0] || 'ETB';
    const defaultSource = this.sources[0] || 'Purchase';

    const itemGroup = this.fb.group({
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
      receivedFrom: [''],
      source: [defaultSource, Validators.required],
      registeredBy: [{ value: registeredBy, disabled: true }, Validators.required],
      warehouseId: [{ value: warehouseId, disabled: true }, Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      currency: [defaultCurrency, Validators.required],
      transactionDate: [{ value: currentEthiopianDate, disabled: true }],
      serialNumbers: this.fb.array([]),
      accessories: this.fb.array([])
    });

    this.items.push(itemGroup);
    this.showBulkSerialNumbers.push(false);
    this.showBulkAccessories.push(false);

    // ✅ Apply FOC logic to new bulk item
    this.enforceFOCUnitPrice(itemGroup);
  }

  removeBulkItem(index: number): void {
    this.items.removeAt(index);
    this.showBulkSerialNumbers.splice(index, 1);
    this.showBulkAccessories.splice(index, 1);
  }

  getSerialNumbersForItem(index: number): FormArray {
    return this.items.at(index).get('serialNumbers') as FormArray;
  }

  getAccessoriesForItem(index: number): FormArray {
    return this.items.at(index).get('accessories') as FormArray;
  }

  addSerialNumberToItem(index: number): void {
    this.getSerialNumbersForItem(index).push(this.fb.control('', Validators.required));
  }

  removeSerialNumberFromItem(itemIndex: number, serialIndex: number): void {
    this.getSerialNumbersForItem(itemIndex).removeAt(serialIndex);
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
    this.itemForm.reset();
    this.bulkForm.reset();

    const currentUser = this.authService.getCurrentUser();
    const registeredBy = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.username || 'Unknown';
    const userRole = this.authService.getRole() || 'SPAREPART';
    const currentEthiopianDate = this.getCurrentEthiopianDate();
    const defaultCurrency = this.currencies[0] || 'ETB';
    const defaultSource = this.sources[0] || 'Purchase';

    this.itemForm.patchValue({
      registeredBy,
      role: userRole,
      warehouseId: userRole,
      transactionDate: currentEthiopianDate,
      quantity: 1,
      unitPrice: 0,
      currency: defaultCurrency,
      source: defaultSource,
      hasVoucherNumber: false
    });
    this.disableFormControls();
    this.enforceFOCUnitPrice(this.itemForm); // ✅ Re-apply

    this.bulkForm.patchValue({
      registeredBy,
      transactionDate: currentEthiopianDate,
      source: defaultSource,
      hasVoucherNumber: false
    });
    this.bulkForm.get('registeredBy')?.disable();
    this.bulkForm.get('transactionDate')?.disable();

    this.serialNumbers.clear();
    this.accessories.clear();
    this.items.clear();
    this.showBulkSerialNumbers = [];
    this.showBulkAccessories = [];
  }

  onSubmit(): void {
    this.itemForm.markAllAsTouched();
    if (this.itemForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      this.successMessage = null;
      return;
    }

    const quantity = this.itemForm.get('quantity')?.value || 0;
    const role = this.itemForm.get('role')?.value || 'SPAREPART';

    if (quantity > 0) {
      if (role !== 'SPAREPART' && role !== 'ELECTRONICS' && this.serialNumbers.length !== quantity) {
        this.errorMessage = 'Non-SPAREPART items must have serial numbers equal to quantity.';
        this.successMessage = null;
        return;
      }
      if (this.serialNumbers.controls.some(control => !control.value || control.value.trim() === '')) {
        this.errorMessage = 'All serial number fields must be filled.';
        this.successMessage = null;
        return;
      }
    }

    // Re-enable controls for submission
    this.itemForm.get('registeredBy')?.enable();
    this.itemForm.get('role')?.enable();
    this.itemForm.get('warehouseId')?.enable();
    this.itemForm.get('transactionDate')?.enable();

    const request: ItemReceiveRequest = {
      ...this.itemForm.getRawValue(),
      voucherNumber: this.itemForm.get('hasVoucherNumber')?.value ? this.itemForm.get('voucherNumber')?.value : null,
      numOfBox: this.itemForm.get('numOfBox')?.value ? parseInt(this.itemForm.get('numOfBox')?.value, 10) : null,
      serialNumbers: this.serialNumbers.value,
      accessories: this.accessories.value
    };

    console.log('Submitting ItemReceiveRequest:', JSON.stringify(request, null, 2));

    this.itemService.createItem(request).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.errorMessage = null;
        this.resetForm();
      },
      error: (err) => {
        this.errorMessage = err.message.includes('Warehouse')
          ? `The role "${this.itemForm.get('role')?.value}" does not match a valid warehouse.`
          : err.message.includes('Category')
            ? `The category "${this.itemForm.get('category')?.value}" does not exist.`
            : err.message.includes('Source')
              ? `The source "${this.itemForm.get('source')?.value}" is invalid.`
              : err.message;
        this.successMessage = null;
        console.error('Error submitting item:', err);
        this.disableFormControls();
        this.enforceFOCUnitPrice(this.itemForm); // Ensure state consistency
      }
    });
  }

  onBulkSubmit(): void {
    this.bulkForm.markAllAsTouched();
    this.items.controls.forEach(control => control.markAllAsTouched());

    if (this.applyReceivedFromToAll) {
      const globalReceivedFrom = this.bulkForm.get('receivedFrom')?.value;
      this.items.controls.forEach(item => {
        if (!item.get('receivedFrom')?.value) {
          item.get('receivedFrom')?.setValue(globalReceivedFrom);
        }
      });
    }

    for (let i = 0; i < this.items.controls.length; i++) {
      const item = this.items.at(i);
      if (!item.get('receivedFrom')?.value) {
        this.errorMessage = `Item ${i + 1} must have a Received From value if not using the global value.`;
        this.successMessage = null;
        return;
      }
      const quantity = item.get('quantity')?.value || 0;
      const role = item.get('role')?.value || 'SPAREPART';
      const serials = this.getSerialNumbersForItem(i);

      if (quantity > 0) {
        if (role !== 'SPAREPART' && role !== 'ELECTRONICS' && serials.length !== quantity) {
          this.errorMessage = `Non-SPAREPART items must have serial numbers equal to quantity for item ${i + 1}.`;
          this.successMessage = null;
          return;
        }
        if (serials.controls.some(control => !control.value || control.value.trim() === '')) {
          this.errorMessage = `All serial number fields for item ${i + 1} must be filled.`;
          this.successMessage = null;
          return;
        }
      }
    }

    if (this.bulkForm.invalid) {
      this.debugFormErrors();
      this.errorMessage = 'Please fill all required fields correctly.';
      this.successMessage = null;
      return;
    }

    // Enable controls for submission
    this.bulkForm.get('registeredBy')?.enable();
    this.items.controls.forEach(control => {
      control.get('role')?.enable();
      control.get('warehouseId')?.enable();
      control.get('transactionDate')?.enable();
    });

    const currentUser = this.authService.getCurrentUser();
    const registeredBy = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.username || 'Unknown';

    this.bulkForm.get('registeredBy')?.setValue(registeredBy);
    this.items.controls.forEach(control => {
      control.get('registeredBy')?.setValue(registeredBy);
    });

    const bulkRequest: BulkReceiveRequest = {
      voucherNumber: this.bulkForm.get('hasVoucherNumber')?.value ? this.bulkForm.get('voucherNumber')?.value : null,
      receivedFrom: this.bulkForm.getRawValue().receivedFrom,
      source: this.bulkForm.getRawValue().source,
      registeredBy,
      items: this.items.getRawValue().map((item: any) => ({
        ...item,
        voucherNumber: item.hasVoucherNumber ? item.voucherNumber : null,
        numOfBox: item.numOfBox ? parseInt(item.numOfBox, 10) : null,
        serialNumbers: item.serialNumbers,
        accessories: item.accessories
      }))
    };

    console.log('Submitting BulkReceiveRequest:', JSON.stringify(bulkRequest, null, 2));

    this.itemService.bulkReceiveItems(bulkRequest).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.errorMessage = null;
        this.resetBulkForm();
      },
      error: (err) => {
        this.errorMessage = err.message.includes('Warehouse')
          ? `One or more item roles do not match a valid warehouse.`
          : err.message.includes('Category')
            ? `One or more categories do not exist.`
            : err.message.includes('Source')
              ? `One or more sources are invalid.`
              : err.message;
        this.successMessage = null;
        console.error('Error submitting bulk items:', err);
        this.disableBulkFormControls();
      }
    });
  }

  updateSerialNumbers(): void {
    const quantity = this.itemForm.get('quantity')?.value || 0;
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    if (role !== 'SPAREPART' && role !== 'ELECTRONICS') {
      while (this.serialNumbers.length < quantity) {
        this.addSerialNumber();
      }
      while (this.serialNumbers.length > quantity) {
        this.removeSerialNumber(this.serialNumbers.length - 1);
      }
    }
  }

  updateBulkSerialNumbers(index: number): void {
    const quantity = this.items.at(index).get('quantity')?.value || 0;
    const role = this.items.at(index).get('role')?.value || 'SPAREPART';
    const serials = this.getSerialNumbersForItem(index);
    if (role !== 'SPAREPART' && role !== 'ELECTRONICS') {
      while (serials.length < quantity) {
        this.addSerialNumberToItem(index);
      }
      while (serials.length > quantity) {
        this.removeSerialNumberFromItem(index, serials.length - 1);
      }
    }
  }

  private resetForm(): void {
  this.itemForm.reset();
  const userRole = this.authService.getRole() || 'SPAREPART';
  const currentEthiopianDate = this.getCurrentEthiopianDate();
  const currentUser = this.authService.getCurrentUser();
  const registeredBy = currentUser?.firstName && currentUser?.lastName
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : currentUser?.username || 'Unknown';
  const defaultCurrency = this.currencies[0] || 'ETB';
  const defaultSource = this.sources[0] || 'Purchase';

  this.itemForm.patchValue({
    registeredBy,
    role: userRole,
    warehouseId: userRole,
    transactionDate: currentEthiopianDate,
    quantity: 1,
    unitPrice: 0,
    currency: defaultCurrency,
    source: defaultSource
  });
  this.disableFormControls();
  this.enforceFOCUnitPrice(this.itemForm);
  this.serialNumbers.clear();
  this.accessories.clear();
  this.showSerialNumbers = false;
  this.showAccessories = false;
}


  private resetBulkForm(): void {
    this.bulkForm.reset();
    const currentUser = this.authService.getCurrentUser();
    const registeredBy = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.username || 'Unknown';
    const currentEthiopianDate = this.getCurrentEthiopianDate();
    const defaultSource = this.sources[0] || 'Purchase';

    this.bulkForm.patchValue({
      registeredBy,
      transactionDate: currentEthiopianDate,
      source: defaultSource
    });
    this.disableBulkFormControls();
    this.items.clear();
    this.showBulkSerialNumbers = [];
    this.showBulkAccessories = [];
    this.applyReceivedFromToAll = true;
  }

  private disableFormControls(): void {
    this.itemForm.get('registeredBy')?.disable();
    this.itemForm.get('role')?.disable();
    this.itemForm.get('warehouseId')?.disable();
    this.itemForm.get('transactionDate')?.disable();
  }

  private disableBulkFormControls(): void {
    this.bulkForm.get('registeredBy')?.disable();
    this.bulkForm.get('transactionDate')?.disable();
    this.items.controls.forEach(control => {
      control.get('role')?.disable();
      control.get('warehouseId')?.disable();
      control.get('transactionDate')?.disable();
    });
  }
}