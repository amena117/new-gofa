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
  sources: string[] = []; // Add sources array
  shelves: ShelfDto[] = [];
  filteredItems: Observable<Item[]>;
  filteredBulkItems: Observable<Item[]>[] = [];
  showSerialNumbers = false;
  showAccessories = false;
  showBulkSerialNumbers: boolean[] = [];
  showBulkAccessories: boolean[] = [];
  isLoadingCategories = false;
  isLoadingCurrencies = false;
  isLoadingSources = false; // Add loading state for sources
  isLoadingShelves = false;
  isSearching = false;
  selectedItemId: number | null = null; // Track selected item for accessory search
  existingAccessories: any[] = []; // Store existing accessories for the selected item
  existingSerialNumbers: string[] = []; // Store existing serial numbers for SPAREPART items
  filteredAccessories: Observable<any[]>[] = []; // For accessory autocomplete
  filteredBulkAccessories: Observable<any[]>[][] = []; // For bulk mode accessory autocomplete
  filteredSerialNumbers: Observable<string[]>[] = []; // For serial number autocomplete
  filteredBulkSerialNumbers: Observable<string[]>[][] = []; // For bulk mode serial number autocomplete
  serialWarnings: { [key: string]: string } = {}; // Store serial number warnings
  bulkSerialWarnings: { [itemIdx: number]: { [serialIdx: number]: string } } = {}; // Bulk mode warnings
  accessorySerialWarnings: { [accIdx: number]: { [serialIdx: number]: string } } = {}; // Accessory serial warnings

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
      source: ['Purchase', Validators.required],
      registeredBy: [{ value: registeredBy, disabled: true }, Validators.required],
      warehouseId: [{ value: userRole, disabled: true }, Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      currency: ['ETB', Validators.required],
      history: [''],
      transactionDate: [{ value: currentEthiopianDate, disabled: true }],
      serialNumbers: this.fb.array([]),
      accessories: this.fb.array([])
    });

    this.bulkForm = this.fb.group({
      voucherNumber: [''],
      hasVoucherNumber: [false],
      receivedFrom: ['', Validators.required],
      source: ['Purchase', Validators.required], // Add source field
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
    // Run all independent init calls in parallel
    forkJoin({
      categories: this.itemService.getAllCategories(),
      shelves: this.itemService.getShelvesByWarehouse(this.authService.getRole() || 'SPAREPART'),
      currencies: this.itemService.getCurrencies(),
      sources: this.itemService.getSources()
    }).subscribe({
      next: ({ categories, shelves, currencies, sources }) => {
        const userRole = this.authService.getRole();
        this.categories = userRole === 'SUPER_ADMIN'
          ? categories.map(c => c.name)
          : categories.filter(c => c.role === userRole).map(c => c.name);

        this.shelves = shelves;
        this.currencies = currencies;
        this.sources = sources;

        const defaultSource = sources[0] || 'Purchase';
        this.itemForm.patchValue({ source: defaultSource });
        this.bulkForm.patchValue({ source: defaultSource });
      },
      error: (err) => {
        this.errorMessage = 'Failed to load form data. Please refresh.';
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
    const userRole = this.authService.getRole() || 'SPAREPART';
    return this.itemService.getItems(value).pipe(
      map(items => items.filter(item =>
        (item.description.toLowerCase().includes(value.toLowerCase()) ||
        item.model.toLowerCase().includes(value.toLowerCase())) &&
        item.warehouseId === userRole // Only show items from user's warehouse
      ))
    );
  }

  selectItem(item: Item): void {
  this.selectedItemId = item.itemId ?? null; // Store the selected item ID, handle undefined
  this.existingAccessories = item.accessories || []; // Store existing accessories
  // Extract serial number strings from ItemSerialNumber objects
  this.existingSerialNumbers = (item.serialNumbers || []).map(sn => sn.serialNumber);
  
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
  this.filteredAccessories = []; // Clear filtered accessories
  this.filteredSerialNumbers = []; // Clear filtered serial numbers
  
  // Don't pre-fill accessories - let user add them manually or search
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
  
  // Store item ID, existing accessories, and serial numbers for this bulk item
  // Extract serial number strings from ItemSerialNumber objects
  const existingSerialNumbers = (item.serialNumbers || []).map(sn => sn.serialNumber);
  this.itemsFormArray.at(index).patchValue({ 
    itemId: item.itemId,
    existingSerialNumbers: existingSerialNumbers
  });
  
  this.getSerialNumbersForItem(index).clear();
  this.getAccessoriesForItem(index).clear();
  
  // Initialize filtered accessories for this item
  if (!this.filteredBulkAccessories[index]) {
    this.filteredBulkAccessories[index] = [];
  }
  
  // Initialize filtered serial numbers for this item
  if (!this.filteredBulkSerialNumbers[index]) {
    this.filteredBulkSerialNumbers[index] = [];
  }
  
  // Don't pre-fill accessories - let user add them manually or search
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
      const serialControl = this.fb.group({
        serialSearch: [''], // Search field for existing serial numbers
        serialNumber: ['', Validators.required]
      });
      this.serialNumbers.push(serialControl);
      
      const index = this.serialNumbers.length - 1;
      
      // Subscribe to serialNumber changes for real-time duplicate check
      serialControl.get('serialNumber')!.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(value => {
          const role = this.itemForm.get('role')?.value;
          if (role === 'SPAREPART') return of(null);
          return value ? this.itemService.checkSerialNumber(value) : of(null);
        })
      ).subscribe(result => {
        if (result && result.exists) {
          this.serialWarnings[index] = `Warning: This serial exists on ${result.description} (${result.model}) in ${result.role} warehouse.`;
        } else {
          delete this.serialWarnings[index];
        }
      });

      // Setup autocomplete for this serial number (SPAREPART only)
      this.filteredSerialNumbers[index] = serialControl.get('serialSearch')!.valueChanges.pipe(
        startWith(''),
        map(value => this.filterSerialNumbers(value || ''))
      );
    }
  }

  removeSerialNumber(index: number): void {
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    if (role === 'SPAREPART') {
      this.serialNumbers.removeAt(index);
      this.filteredSerialNumbers.splice(index, 1);
      delete this.serialWarnings[index];
    }
  }

  // Filter serial numbers based on search term
  private filterSerialNumbers(value: string): string[] {
    if (!value || !this.existingSerialNumbers.length) {
      return this.existingSerialNumbers;
    }
    const filterValue = value.toLowerCase();
    return this.existingSerialNumbers.filter(serial =>
      serial.toLowerCase().includes(filterValue)
    );
  }

  // Select an existing serial number from autocomplete
  selectExistingSerialNumber(serialNumber: string, index: number): void {
    const serialGroup = this.serialNumbers.at(index) as FormGroup;
    serialGroup.patchValue({
      serialSearch: serialNumber,
      serialNumber: serialNumber
    });
  }

  addAccessory(): void {
  const defaultCurrency = this.currencies[0] || 'ETB';
  const accessoryGroup = this.fb.group({
    accessoryId: [null], // Store accessory ID when selecting existing accessory
    accessorySearch: [''], // Search field for existing accessories
    name: ['', Validators.required],
    model: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.min(0)]],
    currency: [defaultCurrency],
    requiresSerialNumbers: [false],
    serialNumbers: this.fb.array([])
  });
  
  this.accessories.push(accessoryGroup);
  
  // Setup autocomplete for this accessory
  const index = this.accessories.length - 1;
  this.filteredAccessories[index] = accessoryGroup.get('accessorySearch')!.valueChanges.pipe(
    startWith(''),
    map(value => this.filterAccessories(value || ''))
  );
}

  removeAccessory(index: number): void {
    this.accessories.removeAt(index);
    this.filteredAccessories.splice(index, 1);
  }

  // Filter accessories based on search term
  private filterAccessories(value: string | any): any[] {
    if (!value || !this.existingAccessories.length) {
      return this.existingAccessories.slice(0, 10); // show first 10 when empty
    }
    
    // If value is an object (selected accessory), return empty array
    if (typeof value !== 'string') {
      return [];
    }
    
    const filterValue = value.toLowerCase();
    return this.existingAccessories.filter(acc =>
      (acc.name?.toLowerCase().includes(filterValue) || '') ||
      (acc.model?.toLowerCase().includes(filterValue) || '')
    );
  }

  // Select an existing accessory from autocomplete
  selectExistingAccessory(accessory: any, index: number): void {
    const accessoryGroup = this.accessories.at(index) as FormGroup;
    accessoryGroup.patchValue({
      accessoryId: accessory.id, // Store the accessory ID for viewing transactions
      accessorySearch: `${accessory.name} - ${accessory.model}`,
      name: accessory.name,
      model: accessory.model,
      unitPrice: accessory.unitPrice || 0,
      currency: accessory.currency || 'ETB',
      requiresSerialNumbers: accessory.requiresSerialNumbers || false,
      quantity: 1 // User will specify new quantity
    });
    
    // Clear serial numbers - user will add new ones for the new quantity
    const serialNumbers = accessoryGroup.get('serialNumbers') as FormArray;
    serialNumbers.clear();
  }

  // View transactions for a selected accessory
  viewAccessoryTransactions(accessoryId: number): void {
    if (!accessoryId) {
      console.warn('No accessory ID provided');
      return;
    }
    
    // Navigate to accessory details page (similar to item details)
    this.router.navigate(['/accessory-details', accessoryId]);
  }

  // Get accessory display name for autocomplete
  displayAccessory(accessory: any): string {
    if (!accessory) return '';
    const name = accessory.name || '';
    const model = accessory.model || '';
    if (!name && !model) return '';
    if (!model) return name;
    if (!name) return model;
    return `${name} - ${model}`;
  }

  addSerialNumberToItem(itemIndex: number): void {
    const role = this.itemsFormArray.at(itemIndex).get('role')?.value || 'SPAREPART';
    const serials = this.getSerialNumbersForItem(itemIndex);
    if (role === 'SPAREPART' && serials.length < 2) {
      const serialControl = this.fb.group({
        serialSearch: [''],
        serialNumber: ['', Validators.required]
      });
      serials.push(serialControl);
      
      // Setup autocomplete for this bulk serial number
      const serialIndex = serials.length - 1;
      
      // Subscribe to serialNumber changes for real-time duplicate check (Bulk)
      if (!this.bulkSerialWarnings[itemIndex]) this.bulkSerialWarnings[itemIndex] = {};
      serialControl.get('serialNumber')!.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(value => {
          const role = this.itemsFormArray.at(itemIndex).get('role')?.value;
          if (role === 'SPAREPART') return of(null);
          return value ? this.itemService.checkSerialNumber(value) : of(null);
        })
      ).subscribe(result => {
        if (result && result.exists) {
          this.bulkSerialWarnings[itemIndex][serialIndex] = `Warning: This serial exists on ${result.description} (${result.model}) in ${result.role} warehouse.`;
        } else {
          delete this.bulkSerialWarnings[itemIndex][serialIndex];
        }
      });

      if (!this.filteredBulkSerialNumbers[itemIndex]) {
        this.filteredBulkSerialNumbers[itemIndex] = [];
      }
      
      // Get existing serial numbers for this item
      const itemGroup = this.itemsFormArray.at(itemIndex);
      const existingSerialNumbers = itemGroup.get('existingSerialNumbers')?.value || [];
      
      this.filteredBulkSerialNumbers[itemIndex][serialIndex] = serialControl.get('serialSearch')!.valueChanges.pipe(
        startWith(''),
        map(value => this.filterBulkSerialNumbers(value || '', existingSerialNumbers))
      );
    }
  }

  removeSerialNumberFromItem(itemIndex: number, serialIndex: number): void {
    const role = this.itemsFormArray.at(itemIndex).get('role')?.value || 'SPAREPART';
    if (role === 'SPAREPART') {
      this.getSerialNumbersForItem(itemIndex).removeAt(serialIndex);
      if (this.filteredBulkSerialNumbers[itemIndex]) {
        this.filteredBulkSerialNumbers[itemIndex].splice(serialIndex, 1);
      }
      if (this.bulkSerialWarnings[itemIndex]) {
        delete this.bulkSerialWarnings[itemIndex][serialIndex];
      }
    }
  }

  // Filter bulk serial numbers
  private filterBulkSerialNumbers(value: string, existingSerialNumbers: string[]): string[] {
    if (!value || !existingSerialNumbers.length) {
      return existingSerialNumbers;
    }
    const filterValue = value.toLowerCase();
    return existingSerialNumbers.filter(serial =>
      serial.toLowerCase().includes(filterValue)
    );
  }

  // Select existing serial number for bulk item
  selectExistingSerialNumberForItem(serialNumber: string, itemIndex: number, serialIndex: number): void {
    const serialGroup = this.getSerialNumbersForItem(itemIndex).at(serialIndex) as FormGroup;
    serialGroup.patchValue({
      serialSearch: serialNumber,
      serialNumber: serialNumber
    });
  }

  addAccessoryToItem(index: number): void {
  const defaultCurrency = this.currencies[0] || 'ETB';
  const accessoryGroup = this.fb.group({
    accessorySearch: [''],
    name: ['', Validators.required],
    model: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.min(0)]],
    currency: [defaultCurrency],
    requiresSerialNumbers: [false],
    serialNumbers: this.fb.array([])
  });
  
  this.getAccessoriesForItem(index).push(accessoryGroup);
  
  // Setup autocomplete for this bulk accessory
  const accessoryIndex = this.getAccessoriesForItem(index).length - 1;
  if (!this.filteredBulkAccessories[index]) {
    this.filteredBulkAccessories[index] = [];
  }
  
  // Get existing accessories for this item
  const itemGroup = this.itemsFormArray.at(index);
  const itemId = itemGroup.get('itemId')?.value;
  
  if (itemId) {
    // Find the item to get its accessories
    const selectedItem = this.items.find(i => i.itemId === itemId);
    const existingAccessories = selectedItem?.accessories || [];
    
    this.filteredBulkAccessories[index][accessoryIndex] = accessoryGroup.get('accessorySearch')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterBulkAccessories(value || '', existingAccessories))
    );
  }
}

  removeAccessoryFromItem(itemIndex: number, accessoryIndex: number): void {
    this.getAccessoriesForItem(itemIndex).removeAt(accessoryIndex);
    if (this.filteredBulkAccessories[itemIndex]) {
      this.filteredBulkAccessories[itemIndex].splice(accessoryIndex, 1);
    }
  }

  // Filter bulk accessories
  private filterBulkAccessories(value: string, existingAccessories: any[]): any[] {
    if (!value || !existingAccessories.length) {
      return [];
    }
    const filterValue = value.toLowerCase();
    return existingAccessories.filter(acc =>
      acc.name.toLowerCase().includes(filterValue) ||
      acc.model.toLowerCase().includes(filterValue)
    );
  }

  // Select existing accessory for bulk item
  selectExistingAccessoryForItem(accessory: any, itemIndex: number, accessoryIndex: number): void {
    const accessoryGroup = this.getAccessoriesForItem(itemIndex).at(accessoryIndex) as FormGroup;
    accessoryGroup.patchValue({
      accessorySearch: `${accessory.name} - ${accessory.model}`,
      name: accessory.name,
      model: accessory.model,
      unitPrice: accessory.unitPrice || 0,
      currency: accessory.currency || 'ETB',
      requiresSerialNumbers: accessory.requiresSerialNumbers || false,
      quantity: 1
    });
    
    const serialNumbers = accessoryGroup.get('serialNumbers') as FormArray;
    serialNumbers.clear();
  }

  toggleSerialNumbers(): void {
    this.showSerialNumbers = !this.showSerialNumbers;
    
    // When showing serial numbers, ensure FormArray is properly initialized
    if (this.showSerialNumbers) {
      const quantity = this.itemForm.get('quantity')?.value || 0;
      const role = this.itemForm.get('role')?.value || 'SPAREPART';
      const currentSerialCount = this.serialNumbers.length;
      
      // For non-SPAREPART roles, serial numbers must match quantity
      if (role !== 'SPAREPART' && role !== 'ELECTRONICS') {
        // Clear existing serial numbers
        while (this.serialNumbers.length > 0) {
          this.serialNumbers.removeAt(0);
        }
        
        // Add the correct number of serial number controls
        for (let i = 0; i < quantity; i++) {
          const serialControl = this.fb.group({
            serialSearch: [''],
            serialNumber: ['', Validators.required]
          });
          this.serialNumbers.push(serialControl);

          // Real-time check for these automatically added serials
          const idx = i;
          serialControl.get('serialNumber')!.valueChanges.pipe(
            debounceTime(500),
            distinctUntilChanged(),
            switchMap(value => value ? this.itemService.checkSerialNumber(value) : of(null))
          ).subscribe(result => {
            if (result && result.exists) {
              this.serialWarnings[idx] = `Warning: This serial exists on ${result.description} (${result.model}) in ${result.role} warehouse.`;
            } else {
              delete this.serialWarnings[idx];
            }
          });
        }
      } else if (role === 'SPAREPART' && currentSerialCount === 0) {
        // For SPAREPART, add one serial number control if none exist
        this.addSerialNumber();
      }
    }
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

  // Accessory serial number methods (matching registration form)
  getAccessorySerialNumbers(accessoryIndex: number): FormArray {
    return this.accessories.at(accessoryIndex).get('serialNumbers') as FormArray;
  }

  getAccessorySerialNumbersForItem(itemIndex: number, accessoryIndex: number): FormArray {
    return this.getAccessoriesForItem(itemIndex).at(accessoryIndex).get('serialNumbers') as FormArray;
  }

  addAccessorySerialNumber(accessoryIndex: number): void {
    const control = this.fb.control('', Validators.required);
    this.getAccessorySerialNumbers(accessoryIndex).push(control);
    
    const serialIdx = this.getAccessorySerialNumbers(accessoryIndex).length - 1;
    if (!this.accessorySerialWarnings[accessoryIndex]) this.accessorySerialWarnings[accessoryIndex] = {};
    
    control.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(value => {
        const role = this.itemForm.get('role')?.value;
        if (role === 'SPAREPART') return of(null);
        return value ? this.itemService.checkSerialNumber(value) : of(null);
      })
    ).subscribe(result => {
      if (result && result.exists) {
        this.accessorySerialWarnings[accessoryIndex][serialIdx] = `Warning: This serial exists on ${result.description} (${result.model}).`;
      } else {
        delete this.accessorySerialWarnings[accessoryIndex][serialIdx];
      }
    });
  }

  removeAccessorySerialNumber(accessoryIndex: number, serialIndex: number): void {
    this.getAccessorySerialNumbers(accessoryIndex).removeAt(serialIndex);
    if (this.accessorySerialWarnings[accessoryIndex]) {
      delete this.accessorySerialWarnings[accessoryIndex][serialIndex];
    }
  }

  addAccessorySerialNumberToItem(itemIndex: number, accessoryIndex: number): void {
    this.getAccessorySerialNumbersForItem(itemIndex, accessoryIndex).push(this.fb.control('', Validators.required));
  }

  removeAccessorySerialNumberFromItem(itemIndex: number, accessoryIndex: number, serialIndex: number): void {
    this.getAccessorySerialNumbersForItem(itemIndex, accessoryIndex).removeAt(serialIndex);
  }

  onAccessoryRequiresSerialNumbersChange(accessoryIndex: number): void {
    const accessoryGroup = this.accessories.at(accessoryIndex);
    const requiresSerialNumbers = accessoryGroup.get('requiresSerialNumbers')?.value;
    const quantity = accessoryGroup.get('quantity')?.value || 1;
    const serialNumbers = this.getAccessorySerialNumbers(accessoryIndex);

    if (requiresSerialNumbers) {
      serialNumbers.clear();
      for (let i = 0; i < quantity; i++) {
        serialNumbers.push(this.fb.control('', Validators.required));
      }
    } else {
      serialNumbers.clear();
    }
  }

  onAccessoryRequiresSerialNumbersChangeForItem(itemIndex: number, accessoryIndex: number): void {
    const accessoryGroup = this.getAccessoriesForItem(itemIndex).at(accessoryIndex);
    const requiresSerialNumbers = accessoryGroup.get('requiresSerialNumbers')?.value;
    const quantity = accessoryGroup.get('quantity')?.value || 1;
    const serialNumbers = this.getAccessorySerialNumbersForItem(itemIndex, accessoryIndex);

    if (requiresSerialNumbers) {
      serialNumbers.clear();
      for (let i = 0; i < quantity; i++) {
        serialNumbers.push(this.fb.control('', Validators.required));
      }
    } else {
      serialNumbers.clear();
    }
  }

  onAccessoryQuantityChange(accessoryIndex: number): void {
    const accessoryGroup = this.accessories.at(accessoryIndex);
    const requiresSerialNumbers = accessoryGroup.get('requiresSerialNumbers')?.value;
    const quantity = accessoryGroup.get('quantity')?.value || 1;
    const serialNumbers = this.getAccessorySerialNumbers(accessoryIndex);

    if (requiresSerialNumbers) {
      const currentCount = serialNumbers.length;
      if (quantity > currentCount) {
        for (let i = currentCount; i < quantity; i++) {
          serialNumbers.push(this.fb.control('', Validators.required));
        }
      } else if (quantity < currentCount) {
        for (let i = currentCount - 1; i >= quantity; i--) {
          serialNumbers.removeAt(i);
        }
      }
    }
  }

  onAccessoryQuantityChangeForItem(itemIndex: number, accessoryIndex: number): void {
    const accessoryGroup = this.getAccessoriesForItem(itemIndex).at(accessoryIndex);
    const requiresSerialNumbers = accessoryGroup.get('requiresSerialNumbers')?.value;
    const quantity = accessoryGroup.get('quantity')?.value || 1;
    const serialNumbers = this.getAccessorySerialNumbersForItem(itemIndex, accessoryIndex);

    if (requiresSerialNumbers) {
      const currentCount = serialNumbers.length;
      if (quantity > currentCount) {
        for (let i = currentCount; i < quantity; i++) {
          serialNumbers.push(this.fb.control('', Validators.required));
        }
      } else if (quantity < currentCount) {
        for (let i = currentCount - 1; i >= quantity; i--) {
          serialNumbers.removeAt(i);
        }
      }
    }
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
      history: [''],
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

    if (quantity > 0) {
      if (role === 'SPAREPART' && this.serialNumbers.length > 2) {
        this.errorMessage = 'SPAREPART items can have up to 2 serial numbers.';
        return;
      }
      if (role !== 'SPAREPART' && role !== 'ELECTRONICS' && this.serialNumbers.length !== quantity) {
        this.errorMessage = 'Non-SPAREPART items must have serial numbers equal to quantity.';
        return;
      }
      const hasEmptySerials = this.serialNumbers.controls.some(control => {
        const value = control.value;
        if (typeof value === 'string') {
          return !value || !value.trim();
        } else {
          return !value.serialNumber || !value.serialNumber.trim();
        }
      });
      if (hasEmptySerials) {
        this.errorMessage = 'All serial number fields must be filled.';
        return;
      }

      // Check for duplicates within the submitted list
      const serialValues: string[] = this.serialNumbers.value.map((s: any) =>
        (typeof s === 'string' ? s : s?.serialNumber || '').trim().toLowerCase()
      ).filter((s: string) => s !== '');

      const serialSet = new Set<string>();
      for (const sn of serialValues) {
        if (serialSet.has(sn)) {
          this.errorMessage = `Duplicate serial number in your list: "${sn.toUpperCase()}"`;
          return;
        }
        serialSet.add(sn);
      }
    }

    // Validate accessory serial numbers
    for (let i = 0; i < this.accessories.length; i++) {
      const accessory = this.accessories.at(i);
      const requiresSerialNumbers = accessory.get('requiresSerialNumbers')?.value;
      const accessoryQuantity = accessory.get('quantity')?.value || 0;
      const serialNumbers = this.getAccessorySerialNumbers(i);

      if (requiresSerialNumbers) {
        if (accessoryQuantity !== serialNumbers.length) {
          this.errorMessage = `Accessory "${accessory.get('name')?.value}" quantity (${accessoryQuantity}) must match serial numbers count (${serialNumbers.length}).`;
          return;
        }
        if (serialNumbers.controls.some(control => !control.value || control.value.trim() === '')) {
          this.errorMessage = `All serial number fields for accessory "${accessory.get('name')?.value}" must be filled.`;
          return;
        }
      }
    }

    this.submitItem();
  }

  private submitItem(): void {
    this.itemForm.get('registeredBy')?.enable();
    this.itemForm.get('warehouseId')?.enable();
    this.itemForm.get('role')?.enable();
    this.itemForm.get('transactionDate')?.enable();

    // Format accessories with serial numbers
    const formattedAccessories = this.accessories.value.map((accessory: any) => ({
      name: accessory.name,
      model: accessory.model,
      quantity: accessory.quantity,
      unitPrice: accessory.unitPrice,
      currency: accessory.currency,
      requiresSerialNumbers: accessory.requiresSerialNumbers,
      serialNumbers: accessory.requiresSerialNumbers ? accessory.serialNumbers : []
    }));

    // Extract serial numbers from FormGroup structure (for SPAREPART)
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    let serialNumbersArray: string[] = [];
    
    // Always extract serial numbers properly, regardless of role
    serialNumbersArray = this.serialNumbers.value.map((serial: any) => {
      if (typeof serial === 'string') {
        return serial;
      } else if (serial && serial.serialNumber) {
        return serial.serialNumber;
      } else {
        return '';
      }
    }).filter((sn: string) => sn.trim() !== ''); // Remove empty strings

    const request: AddItemQuantityRequest = {
      ...this.itemForm.getRawValue(),
      voucherNumber: this.itemForm.get('hasVoucherNumber')?.value ? this.itemForm.get('voucherNumber')?.value : null,
      numOfBox: this.itemForm.get('numOfBox')?.value ? parseInt(this.itemForm.get('numOfBox')?.value, 10) : null,
      serialNumbers: serialNumbersArray,
      transactionDate: this.itemForm.get('transactionDate')?.value,
      accessories: formattedAccessories
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
        // Use the error message formatted by ItemService.handleError
        this.errorMessage = err.message || 'An error occurred while adding the item.';
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
        // Only non-SPAREPART and non-ELECTRONICS items must have serial numbers equal to quantity
        if (role !== 'SPAREPART' && role !== 'ELECTRONICS' && serials.length !== quantity) {
          this.errorMessage = `Non-SPAREPART items must have serial numbers equal to quantity for item ${i + 1}.`;
          return;
        }
        // Check if serial numbers are filled (handle both string and FormGroup)
        const hasEmptySerials = serials.controls.some(control => {
          const value = control.value;
          if (typeof value === 'string') {
            return !value || !value.trim();
          } else {
            return !value.serialNumber || !value.serialNumber.trim();
          }
        });
        if (hasEmptySerials) {
          this.errorMessage = `All serial number fields for item ${i + 1} must be filled.`;
          return;
        }
      }

      // Validate accessory serial numbers for this item
      const accessories = this.getAccessoriesForItem(i);
      for (let j = 0; j < accessories.length; j++) {
        const accessory = accessories.at(j);
        const requiresSerialNumbers = accessory.get('requiresSerialNumbers')?.value;
        const accessoryQuantity = accessory.get('quantity')?.value || 0;
        const accessorySerialNumbers = this.getAccessorySerialNumbersForItem(i, j);

        if (requiresSerialNumbers) {
          if (accessoryQuantity !== accessorySerialNumbers.length) {
            this.errorMessage = `Item ${i + 1}: Accessory "${accessory.get('name')?.value}" quantity (${accessoryQuantity}) must match serial numbers count (${accessorySerialNumbers.length}).`;
            return;
          }
          if (accessorySerialNumbers.controls.some(control => !control.value || control.value.trim() === '')) {
            this.errorMessage = `Item ${i + 1}: All serial number fields for accessory "${accessory.get('name')?.value}" must be filled.`;
            return;
          }
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
      items: this.itemsFormArray.getRawValue().map((item: any) => {
        // Extract serial numbers from FormGroup structure
        // Always extract properly, regardless of role
        let serialNumbersArray: string[] = [];
        if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
          serialNumbersArray = item.serialNumbers.map((serial: any) => {
            if (typeof serial === 'string') {
              return serial;
            } else if (serial && serial.serialNumber) {
              return serial.serialNumber;
            } else {
              return '';
            }
          }).filter((sn: string) => sn.trim() !== ''); // Remove empty strings
        }
        
        return {
          ...item,
          voucherNumber: item.hasVoucherNumber ? item.voucherNumber : null,
          numOfBox: item.numOfBox ? parseInt(item.numOfBox, 10) : null,
          serialNumbers: serialNumbersArray,
          transactionDate: item.transactionDate,
          accessories: item.accessories.map((acc: any) => ({
            name: acc.name,
            model: acc.model,
            quantity: acc.quantity,
            unitPrice: acc.unitPrice,
            currency: acc.currency,
            requiresSerialNumbers: acc.requiresSerialNumbers,
            serialNumbers: acc.requiresSerialNumbers ? acc.serialNumbers : []
          }))
        };
      })
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
        this.errorMessage = err.message || 'An error occurred while adding bulk items.';
        this.resetBulkFormControls();
      }
    });
  }

  updateSerialNumbers(): void {
    const quantity = this.itemForm.get('quantity')?.value || 0;
    const role = this.itemForm.get('role')?.value || 'SPAREPART';
    const serials = this.serialNumbers;

    // SPAREPART and ELECTRONICS don't require serial numbers to match quantity
    if (role !== 'SPAREPART' && role !== 'ELECTRONICS') {
      while (serials.length < quantity) {
        serials.push(this.fb.control('', Validators.required));
      }
      while (serials.length > quantity) {
        serials.removeAt(serials.length - 1);
      }
    } else if (role === 'SPAREPART') {
      // SPAREPART can have up to 2 serial numbers
      while (serials.length > 2) {
        serials.removeAt(serials.length - 1);
      }
    }
    // ELECTRONICS has no limit on serial numbers
  }

  updateBulkSerialNumbers(index: number): void {
    const quantity = this.itemsFormArray.at(index).get('quantity')?.value || 0;
    const role = this.itemsFormArray.at(index).get('role')?.value || 'SPAREPART';
    const serials = this.getSerialNumbersForItem(index);

    // SPAREPART and ELECTRONICS don't require serial numbers to match quantity
    if (role !== 'SPAREPART' && role !== 'ELECTRONICS') {
      while (serials.length < quantity) {
        serials.push(this.fb.control('', Validators.required));
      }
      while (serials.length > quantity) {
        serials.removeAt(serials.length - 1);
      }
    } else if (role === 'SPAREPART') {
      // SPAREPART can have up to 2 serial numbers
      while (serials.length > 2) {
        serials.removeAt(serials.length - 1);
      }
    }
    // ELECTRONICS has no limit on serial numbers
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

  public debugForm(): void {
    console.log('🔍 Form Valid:', this.itemForm.valid);
    console.log('🔍 Form Invalid:', this.itemForm.invalid);
    console.log('🔍 Form Value:', this.itemForm.value);
    console.log('🔍 Form Errors:', this.itemForm.errors);
    
    const invalidControls: string[] = [];
    Object.keys(this.itemForm.controls).forEach(key => {
      const control = this.itemForm.get(key);
      if (control && control.invalid) {
        invalidControls.push(key);
        console.log(`❌ Invalid field: ${key}`, {
          value: control.value,
          errors: control.errors,
          touched: control.touched,
          dirty: control.dirty,
          disabled: control.disabled
        });
        
        // If it's a FormArray, check each control
        if (control instanceof FormArray) {
          console.log(`  📋 FormArray "${key}" has ${control.length} controls:`);
          control.controls.forEach((arrayControl, index) => {
            console.log(`    [${index}]:`, {
              valid: arrayControl.valid,
              invalid: arrayControl.invalid,
              value: arrayControl.value,
              errors: arrayControl.errors
            });
            
            // If it's a FormGroup, check each field
            if (arrayControl instanceof FormGroup) {
              Object.keys(arrayControl.controls).forEach(fieldKey => {
                const fieldControl = arrayControl.get(fieldKey);
                if (fieldControl && fieldControl.invalid) {
                  console.log(`      ❌ Invalid field in group: ${fieldKey}`, {
                    value: fieldControl.value,
                    errors: fieldControl.errors,
                    touched: fieldControl.touched
                  });
                }
              });
            }
          });
        }
      }
    });
    
    if (invalidControls.length === 0) {
      console.log('✅ All fields are valid!');
    } else {
      console.log('❌ Invalid fields:', invalidControls);
    }
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