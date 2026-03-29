import { Component, OnInit } from '@angular/core';
import { FormControl, NgForm, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ItemService } from '../../services/item.service';
import { Model22Service } from '../../services/model22.service';
import { AuthService } from '../../services/auth.service';
import { Model22WithAccessoriesRequest, Model22ItemWithAccessoriesRequest, AccessorySelectionRequest, ApiResponse } from '../../model/model22';
import { Item, ItemSerialNumber, Accessory } from '../../model/item.model';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import Kenat from 'kenat';

@Component({
  selector: 'app-model22-registration',
  templateUrl: './model22-registration.component.html',
  styleUrls: ['./model22-registration.component.css']
})
export class Model22RegistrationComponent implements OnInit {
  model22: Model22WithAccessoriesRequest = {
    voucherNumber: '',
    department: '',
    recipientName: '',
    recipientOrganization: '',
    ethiopianDate: '',
    role: '',
    registeredBy: '',
    items: [this.createDefaultItem()]
  };
  submitted = false;
  errorMessage: string | null = null;
  errorDetails: string[] = [];
  successMessage: string | null = null;
  allowedRoles = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  availableItems: Item[] = [];
  filteredItems: { [key: number]: Observable<Item[]> } = {};
  selectedItem: { [key: number]: Item | null } = {};
  searchControls: { [key: number]: FormControl } = {};
  quantityControls: { [key: number]: FormControl } = {};
  serialControls: { [key: number]: FormControl[] } = {};
  filteredSerials: { [key: number]: Observable<string[]>[] } = {};
  serialNumberErrors: { [key: number]: string[] } = {};
  currencyControls: { [key: number]: FormControl } = {};
  accessoryControls: { [key: number]: { [accessoryId: number]: FormControl } } = {};
  availableCurrencies: string[] = [];
  voucherNumberControl: FormControl = new FormControl('');
  useAccessories = false;
  
  // New properties for withdrawal type toggle
  withdrawalTypeControls: { [key: number]: FormControl } = {}; // 'regular' or 'accessory-only'

  // New properties for custom autocomplete
  showSuggestions: { [key: number]: { [key: number]: boolean } } = {};
  hoveredSuggestion: string | null = null;

  constructor(
    private model22Service: Model22Service,
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeFormWithUserRole();
    this.setCurrentEthiopianDate();
    this.setRegisteredBy();
    this.loadAvailableCurrencies();
    this.loadAvailableItems();
    this.initializeItemRows();
  }

  private loadAvailableCurrencies(): void {
    this.itemService.getCurrencies().subscribe({
      next: (currencies: string[]) => {
        this.availableCurrencies = currencies;
        console.log('Model22Registration: Loaded currencies:', this.availableCurrencies);

        if (!this.availableCurrencies.includes('FOC')) {
          this.availableCurrencies.push('FOC');
        }

        this.model22.items.forEach((item, index) => {
          if (!item.currency) {
            item.currency = 'ETB';
            this.currencyControls[index].setValue('ETB');
          }
        });
      },
      error: (err: any) => {
        this.errorMessage = `Failed to load currencies: ${err.message || 'Unknown error'}`;
        this.errorDetails = [];
        console.error('Error loading currencies:', err);
        this.availableCurrencies = ['ETB', 'POUND', 'USD', 'EURO', 'FOC'];
      }
    });
  }

  private setRegisteredBy(): void {
    const currentUser = this.authService.getCurrentUser();
    const registeredBy = currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser?.username || 'Unknown';
    console.log('Model22Registration: RegisteredBy:', registeredBy);
    this.model22.registeredBy = registeredBy;
    if (this.model22.registeredBy === 'Unknown') {
      console.warn('Model22Registration: RegisteredBy set to Unknown - redirecting to login');
      this.errorMessage = 'Unable to fetch user information. Please ensure you are logged in.';
      this.errorDetails = [];
      this.router.navigate(['/login']);
    }
  }

  private initializeFormWithUserRole(): void {
    const userRole = this.authService.getRole()?.toUpperCase();
    if (userRole && this.allowedRoles.includes(userRole)) {
      this.model22.role = userRole;
    } else {
      this.errorMessage = 'Invalid or missing role. Please contact the administrator.';
      this.errorDetails = [];
      console.warn('Model22Registration: Invalid or missing role:', userRole);
      this.router.navigate(['/unauthorized']);
    }
  }

  private setCurrentEthiopianDate(): void {
    this.model22Service.getCurrentEthiopianDate().subscribe({
      next: (date: string) => {
        this.model22.ethiopianDate = date;
        console.log('Model22Registration: Ethiopian date set:', date);
      },
      error: (err: any) => {
        console.error('Error fetching Ethiopian date:', err);
        try {
          const kenatDate = new Kenat();
          this.model22.ethiopianDate = kenatDate.format({ lang: 'amharic' });
          console.log('Model22Registration: Fallback Ethiopian date:', this.model22.ethiopianDate);
        } catch (error) {
          this.model22.ethiopianDate = 'ነሐሴ 1, 2017';
          this.errorMessage = 'Failed to set Ethiopian date. Using fallback date.';
          this.errorDetails = [];
          console.error('Error formatting fallback Ethiopian date:', error);
        }
      }
    });
  }

  private loadAvailableItems(): void {
    const userRole = this.authService.getRole()?.toUpperCase() || 'SPAREPART';
    this.itemService.getItemsByRole([userRole]).subscribe({
      next: (items: Item[]) => {
        this.availableItems = items
          .filter(item => item.role?.toUpperCase() === userRole &&
            (item.quantity > 0 || (item.accessories && item.accessories.some((a: any) => a.quantity > 0))))
          .map(item => ({
            ...item,
            description: item.description || 'Unknown',
            category: item.category || 'Unknown',
            unitPrice: item.unitPrice ?? 0,
            currency: item.currency ?? 'ETB',
            serialNumbers: item.serialNumbers ?? [],
            accessories: item.accessories ?? []
          }));
        console.log('Model22Registration: Loaded available items:', this.availableItems);
        this.initializeFilteredItems();
      },
      error: (err: any) => {
        this.errorMessage = err.message.includes('Warehouse')
          ? `No warehouse found for role ${userRole}. Please contact an administrator.`
          : `Failed to load available items: ${err.message || 'Unknown error'}`;
        this.errorDetails = [];
        console.error('Error loading items:', err);
      }
    });
  }

  private initializeItemRows(): void {
    this.model22.items.forEach((item: Model22ItemWithAccessoriesRequest, index: number) => {
      this.filteredItems[index] = of(this.getAvailableItemsForIndex(index));
      this.selectedItem[index] = null;
      this.searchControls[index] = new FormControl('', { nonNullable: true });
      this.quantityControls[index] = new FormControl(item.quantity || 1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)]
      });
      this.currencyControls[index] = new FormControl(item.currency || 'ETB', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern('^(ETB|POUND|USD|EURO|FOC)$')]
      });
      
      // Initialize withdrawal type control
      this.withdrawalTypeControls[index] = new FormControl(item.isAccessoryOnly ? 'accessory-only' : 'regular', {
        nonNullable: true
      });
      
      // Subscribe to withdrawal type changes
      this.withdrawalTypeControls[index].valueChanges.subscribe(type => {
        this.onWithdrawalTypeChange(index, type);
      });
      
      // Subscribe to currency changes to update accessories
      this.currencyControls[index].valueChanges.subscribe(newCurrency => {
        this.updateAccessoriesCurrency(index, newCurrency);
      });
      
      this.serialControls[index] = [];
      this.filteredSerials[index] = [];
      this.serialNumberErrors[index] = [];
      this.accessoryControls[index] = {};
      this.showSuggestions[index] = {};
      this.setupSearchFilter(index);
    });
  }

  private initializeFilteredItems(): void {
    this.model22.items.forEach((item: Model22ItemWithAccessoriesRequest, index: number) => {
      this.filteredItems[index] = of(this.getAvailableItemsForIndex(index));
      this.setupSearchFilter(index);
    });
  }

  private setupSearchFilter(index: number): void {
    this.filteredItems[index] = this.searchControls[index].valueChanges.pipe(
      startWith(''),
      map(value => this.filterItems(value || '', index))
    );
  }

  private filterItems(value: string, index: number): Item[] {
    const filterValue = value.toString().toLowerCase();
    const userRole = this.authService.getRole()?.toUpperCase() || 'SPAREPART';
    const isAccessoryOnly = this.withdrawalTypeControls[index]?.value === 'accessory-only';
    const selectedItemIds = Object.values(this.selectedItem)
      .filter(item => item !== null && item !== this.selectedItem[index])
      .map(item => item!.itemId!);

    return this.availableItems.filter(item =>
      item.role?.toUpperCase() === userRole &&
      !selectedItemIds.includes(item.itemId!) &&
      // In accessory-only mode, only show items that have accessories with stock
      // In regular mode, only show items with quantity > 0
      (isAccessoryOnly
        ? (item.accessories && item.accessories.some((a: any) => a.quantity > 0))
        : item.quantity > 0) &&
      (
        (item.description ?? '').toLowerCase().includes(filterValue) ||
        (item.model ?? '').toLowerCase().includes(filterValue) ||
        (item.serialNumbers ?? []).some((sn: ItemSerialNumber) => sn.serialNumber.toLowerCase().includes(filterValue))
      )
    );
  }

  private getAvailableItemsForIndex(index: number): Item[] {
    const isAccessoryOnly = this.withdrawalTypeControls[index]?.value === 'accessory-only';
    const selectedItemIds = Object.values(this.selectedItem)
      .filter(item => item !== null && item !== this.selectedItem[index])
      .map(item => item!.itemId!);
    return this.availableItems.filter(item =>
      !selectedItemIds.includes(item.itemId!) &&
      (isAccessoryOnly
        ? (item.accessories && item.accessories.some((a: any) => a.quantity > 0))
        : item.quantity > 0)
    );
  }

  createDefaultItem(): Model22ItemWithAccessoriesRequest {
    return {
      description: '',
      model: '',
      quantity: 1,
      unitPrice: 0,
      currency: 'ETB',
      serialNumbers: [],
      voucherNumber: '',
      isAccessoryOnly: false,
      parentItemId: undefined,
      selectedAccessories: []
    };
  }

  addItem(): void {
    const newIndex = this.model22.items.length;
    this.model22.items.push(this.createDefaultItem());
    this.filteredItems[newIndex] = of(this.getAvailableItemsForIndex(newIndex));
    this.selectedItem[newIndex] = null;
    this.searchControls[newIndex] = new FormControl('', { nonNullable: true });
    this.quantityControls[newIndex] = new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)]
    });
    this.currencyControls[newIndex] = new FormControl('ETB', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern('^(ETB|POUND|USD|EURO|FOC)$')]
    });
    
    // Initialize withdrawal type control for new item
    this.withdrawalTypeControls[newIndex] = new FormControl('regular', {
      nonNullable: true
    });
    
    // Subscribe to withdrawal type changes
    this.withdrawalTypeControls[newIndex].valueChanges.subscribe(type => {
      this.onWithdrawalTypeChange(newIndex, type);
    });
    
    this.serialControls[newIndex] = [];
    this.filteredSerials[newIndex] = [];
    this.serialNumberErrors[newIndex] = [];
    this.accessoryControls[newIndex] = {};
    this.showSuggestions[newIndex] = {};
    this.setupSearchFilter(newIndex);
  }

  removeItem(index: number): void {
    if (this.model22.items.length > 1) {
      this.model22.items.splice(index, 1);

      // Rebuild the controls objects to maintain proper indexing
      const rebuildControls = (obj: any) => {
        const newObj: any = {};
        Object.keys(obj).forEach((key: string) => {
          const keyNum = parseInt(key);
          if (keyNum < index) {
            newObj[keyNum] = obj[keyNum];
          } else if (keyNum > index) {
            newObj[keyNum - 1] = obj[keyNum];
          }
        });
        return newObj;
      };

      this.filteredItems = rebuildControls(this.filteredItems);
      this.selectedItem = rebuildControls(this.selectedItem);
      this.searchControls = rebuildControls(this.searchControls);
      this.quantityControls = rebuildControls(this.quantityControls);
      this.currencyControls = rebuildControls(this.currencyControls);
      this.serialControls = rebuildControls(this.serialControls);
      this.filteredSerials = rebuildControls(this.filteredSerials);
      this.serialNumberErrors = rebuildControls(this.serialNumberErrors);
      this.accessoryControls = rebuildControls(this.accessoryControls);
      this.showSuggestions = rebuildControls(this.showSuggestions);
    }
  }

  selectItem(event: MatAutocompleteSelectedEvent, index: number): void {
    const item = event.option.value as Item;
    console.log('Model22Registration: Selected item:', item);

    if (!item) return;

    // Combine duplicate accessories by name and model, summing their quantities
    if (item.accessories && item.accessories.length > 0) {
      const accessoryMap = new Map<string, any>();
      
      item.accessories.forEach(accessory => {
        const key = `${accessory.name}_${accessory.model}`;
        
        if (accessoryMap.has(key)) {
          // Combine quantities and serial numbers
          const existing = accessoryMap.get(key);
          existing.quantity += accessory.quantity;
          
          // Merge serial numbers if they exist
          if (accessory.serialNumbers && accessory.serialNumbers.length > 0) {
            if (!existing.serialNumbers) {
              existing.serialNumbers = [];
            }
            existing.serialNumbers.push(...accessory.serialNumbers);
          }
        } else {
          // Add new accessory (clone to avoid reference issues)
          accessoryMap.set(key, {
            ...accessory,
            serialNumbers: accessory.serialNumbers ? [...accessory.serialNumbers] : []
          });
        }
      });
      
      // Convert map back to array
      item.accessories = Array.from(accessoryMap.values());
      console.log('Model22Registration: Combined accessories:', item.accessories);
    }

    this.selectedItem[index] = item;
    this.searchControls[index].setValue(item.description);
    this.model22.items[index].description = item.description;
    this.model22.items[index].model = item.model;
    this.model22.items[index].quantity = 1;
    this.quantityControls[index].setValue(1);
    this.model22.items[index].unitPrice = item.unitPrice || 0;
    this.model22.items[index].serialNumbers = [];
    this.model22.items[index].selectedAccessories = [];

    // Initialize accessory controls
    this.accessoryControls[index] = {};
    if (item.accessories && item.accessories.length > 0) {
      item.accessories.forEach(accessory => {
        this.accessoryControls[index][accessory.id!] = new FormControl(0, [
          Validators.min(0),
          Validators.max(accessory.quantity)
        ]);
      });
    }

    // Update max validator based on available quantity
    this.quantityControls[index].setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(item.quantity)
    ]);
    this.quantityControls[index].updateValueAndValidity();

    const role = this.model22.role;

    if (item.serialNumbers && item.serialNumbers.length > 0) {
      console.log(`Item has ${item.serialNumbers.length} serial numbers, role: ${role}`);

      if (role === 'SPAREPART') {
        const initialSerials = 1;
        this.model22.items[index].serialNumbers = new Array(initialSerials).fill('');
        this.serialNumberErrors[index] = new Array(initialSerials).fill('');
        this.serialControls[index] = new Array(initialSerials).fill(null).map(() => new FormControl('', Validators.required));
        this.filteredSerials[index] = new Array(initialSerials).fill(null).map((_, i) => this.setupSerialFilter(index, i));
      } else {
        const initialSerials = 1;
        this.model22.items[index].serialNumbers = new Array(initialSerials).fill('');
        this.serialNumberErrors[index] = new Array(initialSerials).fill('');
        this.serialControls[index] = new Array(initialSerials).fill(null).map(() => new FormControl('', Validators.required));
        this.filteredSerials[index] = new Array(initialSerials).fill(null).map((_, i) => this.setupSerialFilter(index, i));
        this.onQuantityChange(index);
      }
    } else {
      console.log('Item has no serial numbers');
      this.serialNumberErrors[index] = [];
      this.serialControls[index] = [];
      this.filteredSerials[index] = [];
    }

    this.initializeFilteredItems();
  }

  private setupSerialFilter(itemIndex: number, serialIndex: number): Observable<string[]> {
    return this.serialControls[itemIndex][serialIndex].valueChanges.pipe(
      startWith(''),
      map(value => this.filterSerials(value || '', itemIndex))
    );
  }

  private filterSerials(value: string, itemIndex: number): string[] {
    const filterValue = value.toString().toLowerCase();
    const selected = this.selectedItem[itemIndex];

    if (!selected || !selected.serialNumbers?.length) {
      return [];
    }

    const selectedSerials = this.model22.items[itemIndex].serialNumbers.filter(s => s);
    return selected.serialNumbers
      .map((sn: ItemSerialNumber) => sn.serialNumber)
      .filter(sn => sn && !selectedSerials.includes(sn) && sn.toLowerCase().includes(filterValue));
  }

  selectSerial(event: MatAutocompleteSelectedEvent, itemIndex: number, serialIndex: number): void {
    const serial = event.option.value;
    if (!serial) return;

    this.model22.items[itemIndex].serialNumbers[serialIndex] = serial;
    this.serialControls[itemIndex][serialIndex].setValue(serial);
    this.serialNumberErrors[itemIndex][serialIndex] = '';
  }

  onSerialInput(event: any, itemIndex: number, serialIndex: number): void {
    const value = event.target.value;
    console.log(`🔧 MAIN ITEM: Serial input changed: Item ${itemIndex}, Serial ${serialIndex} = "${value}"`);

    // CRITICAL: Ensure we're updating the correct item's serial number
    // Do NOT update other items' serial numbers
    if (!this.model22.items[itemIndex]) {
      console.error(`Item at index ${itemIndex} does not exist!`);
      return;
    }

    if (!this.model22.items[itemIndex].serialNumbers) {
      this.model22.items[itemIndex].serialNumbers = [];
    }

    // Ensure the array is large enough
    while (this.model22.items[itemIndex].serialNumbers.length <= serialIndex) {
      this.model22.items[itemIndex].serialNumbers.push('');
    }

    // Update ONLY this specific item's serial number
    this.model22.items[itemIndex].serialNumbers[serialIndex] = value;

    console.log(`🔧 MAIN ITEM: Updated serialNumbers array for item ${itemIndex}:`, this.model22.items[itemIndex].serialNumbers);

    // Show suggestions for THIS specific input only
    this.showSuggestions[itemIndex] = this.showSuggestions[itemIndex] || {};
    this.showSuggestions[itemIndex][serialIndex] = true;
  }

  showSerialSuggestions(itemIndex: number, serialIndex: number): void {
    this.showSuggestions[itemIndex] = this.showSuggestions[itemIndex] || {};
    this.showSuggestions[itemIndex][serialIndex] = true;
  }

  hideSerialSuggestions(itemIndex: number, serialIndex: number): void {
    setTimeout(() => {
      if (this.showSuggestions[itemIndex]) {
        this.showSuggestions[itemIndex][serialIndex] = false;
      }
    }, 200);
  }

  getFilteredSerials(itemIndex: number, serialIndex: number): string[] {
    const selected = this.selectedItem[itemIndex];
    if (!selected || !selected.serialNumbers) return [];

    const currentValue = this.serialControls[itemIndex]?.[serialIndex]?.value || '';
    
    // Get serial numbers already selected for THIS specific item (excluding current position)
    const selectedSerials = this.model22.items[itemIndex].serialNumbers.filter((s, index) =>
      index !== serialIndex && s
    );

    return selected.serialNumbers
      .map(sn => sn.serialNumber)
      .filter(sn =>
        sn &&
        !selectedSerials.includes(sn) &&
        sn.toLowerCase().includes(currentValue.toLowerCase())
      );
  }

  selectSerialManual(serial: string, itemIndex: number, serialIndex: number): void {
    console.log(`🔧 MAIN ITEM: Manually selecting serial number: Item ${itemIndex}, Serial ${serialIndex} = "${serial}"`);
    
    // CRITICAL: Update ONLY this specific item's serial number
    if (!this.model22.items[itemIndex]) {
      console.error(`Item at index ${itemIndex} does not exist!`);
      return;
    }

    if (!this.model22.items[itemIndex].serialNumbers) {
      this.model22.items[itemIndex].serialNumbers = [];
    }

    // Ensure the array is large enough
    while (this.model22.items[itemIndex].serialNumbers.length <= serialIndex) {
      this.model22.items[itemIndex].serialNumbers.push('');
    }

    // Update ONLY this specific item's serial number
    this.model22.items[itemIndex].serialNumbers[serialIndex] = serial;
    
    // Update the form control for this specific serial number
    if (this.serialControls[itemIndex] && this.serialControls[itemIndex][serialIndex]) {
      this.serialControls[itemIndex][serialIndex].setValue(serial);
    }
    
    // Clear any error for this serial number
    if (this.serialNumberErrors[itemIndex]) {
      this.serialNumberErrors[itemIndex][serialIndex] = '';
    }

    console.log(`🔧 MAIN ITEM: Updated serialNumbers array for item ${itemIndex}:`, this.model22.items[itemIndex].serialNumbers);

    // Hide suggestions for THIS specific input
    if (this.showSuggestions[itemIndex]) {
      this.showSuggestions[itemIndex][serialIndex] = false;
    }
  }

  onQuantityChange(index: number): void {
    const quantity = this.quantityControls[index].value;
    const selected = this.selectedItem[index];

    if (!selected) {
      this.quantityControls[index].setErrors({ noItemSelected: true });
      this.model22.items[index].quantity = quantity;
      this.model22.items[index].serialNumbers = [];
      this.serialNumberErrors[index] = [];
      this.serialControls[index] = [];
      this.filteredSerials[index] = [];
      return;
    }

    if (quantity <= 0) {
      this.quantityControls[index].setErrors({ invalidQuantity: true });
      this.model22.items[index].quantity = quantity;
      this.model22.items[index].serialNumbers = [];
      this.serialNumberErrors[index] = [];
      this.serialControls[index] = [];
      this.filteredSerials[index] = [];
      return;
    }

    if (quantity > selected.quantity) {
      this.quantityControls[index].setErrors({ exceedsStock: true });
    } else {
      this.quantityControls[index].setErrors(null);
    }

    this.model22.items[index].quantity = quantity;
    const role = this.model22.role;

    if (selected.serialNumbers && selected.serialNumbers.length > 0) {
      if (role === 'SPAREPART') {
        console.log(`SPAREPART: Current serial count: ${this.model22.items[index].serialNumbers.length}`);
      } else {
        const maxSerials = quantity;
        console.log(`VHF/HF/ELECTRONICS: Adjusting serial numbers to match quantity: ${maxSerials}`);

        this.serialControls[index] = [];
        this.filteredSerials[index] = [];
        this.serialNumberErrors[index] = [];

        this.model22.items[index].serialNumbers = new Array(maxSerials).fill('');
        this.serialNumberErrors[index] = new Array(maxSerials).fill('');

        for (let i = 0; i < maxSerials; i++) {
          this.serialControls[index][i] = new FormControl('', Validators.required);
          this.filteredSerials[index][i] = this.setupSerialFilter(index, i);
        }

        console.log(`VHF/HF/ELECTRONICS: Created ${maxSerials} serial number inputs`);
      }
    }
  }

  onAccessoryQuantityChange(itemIndex: number, accessoryId: number, inputQuantity: any): void {
    const quantity = Number(inputQuantity);
    const selected = this.selectedItem[itemIndex];
    if (!selected) return;

    // Find the accessory in the selected item
    const accessory = selected.accessories?.find(a => a.id === accessoryId);
    if (!accessory) return;

    console.log(`🔧 Accessory quantity change: ${accessory.name}, quantity: ${quantity}`);
    console.log(`🔧 Accessory details:`, accessory);
    console.log(`🔧 Requires serial numbers:`, accessory.requiresSerialNumbers);

    // Validate quantity
    if (quantity < 0 || quantity > accessory.quantity) {
      console.warn(`Invalid quantity ${quantity} for accessory ${accessory.name}. Max: ${accessory.quantity}`);
      return;
    }

    // Find or create accessory selection
    let accessorySelection = this.model22.items[itemIndex].selectedAccessories.find(
      a => a.accessoryId === accessoryId
    );

    if (accessorySelection) {
      if (quantity === 0) {
        // Remove if quantity is 0
        this.model22.items[itemIndex].selectedAccessories =
          this.model22.items[itemIndex].selectedAccessories.filter(
            a => a.accessoryId !== accessoryId
          );
      } else {
        accessorySelection.quantity = quantity;
        
        // Initialize price if not set
        if (accessorySelection.unitPrice === undefined) {
          accessorySelection.unitPrice = accessory.unitPrice || 0;
        }
        
        // In accessory-only mode, keep existing currency or use accessory's currency
        // In regular mode, sync with parent item currency
        const isAccessoryOnly = this.withdrawalTypeControls[itemIndex]?.value === 'accessory-only';
        if (!accessorySelection.currency || !isAccessoryOnly) {
          accessorySelection.currency = isAccessoryOnly 
            ? (accessory.currency || 'ETB')
            : (this.model22.items[itemIndex].currency || 'ETB');
        }

        // Handle serial numbers for accessories that require them
        if (accessory.requiresSerialNumbers) {
          console.log(`🔧 Accessory ${accessory.name} requires serial numbers, adjusting array to ${quantity}`);
          // Initialize or adjust serial numbers array to match quantity
          if (!accessorySelection.serialNumbers) {
            accessorySelection.serialNumbers = [];
          }

          // Adjust serial numbers array length to match quantity
          while (accessorySelection.serialNumbers.length < quantity) {
            accessorySelection.serialNumbers.push('');
          }
          while (accessorySelection.serialNumbers.length > quantity) {
            accessorySelection.serialNumbers.pop();
          }
          console.log(`🔧 Accessory ${accessory.name} serial numbers array:`, accessorySelection.serialNumbers);
        } else {
          // Clear serial numbers if not required
          accessorySelection.serialNumbers = [];
        }
      }
    } else if (quantity > 0) {
      // Add new selection
      const isAccessoryOnly = this.withdrawalTypeControls[itemIndex]?.value === 'accessory-only';
      const newSelection: any = {
        accessoryId: accessoryId,
        quantity: quantity,
        serialNumbers: [],
        unitPrice: accessory.unitPrice || 0,
        // In accessory-only mode, use accessory's currency; in regular mode, use parent item currency
        currency: isAccessoryOnly 
          ? (accessory.currency || 'ETB')
          : (this.model22.items[itemIndex].currency || 'ETB')
      };

      // Initialize serial numbers if required
      if (accessory.requiresSerialNumbers) {
        console.log(`🔧 Creating new accessory selection for ${accessory.name} with ${quantity} serial numbers`);
        for (let i = 0; i < quantity; i++) {
          newSelection.serialNumbers.push('');
        }
        console.log(`🔧 New accessory selection serial numbers:`, newSelection.serialNumbers);
      }

      this.model22.items[itemIndex].selectedAccessories.push(newSelection);
    }

    // Update the form control
    if (this.accessoryControls[itemIndex] && this.accessoryControls[itemIndex][accessoryId]) {
      this.accessoryControls[itemIndex][accessoryId].setValue(quantity);
    }

    console.log(`🔧 Item ${itemIndex + 1} accessories after change:`,
      this.model22.items[itemIndex].selectedAccessories);
  }

  addSerialNumber(itemIndex: number): void {
    const selected = this.selectedItem[itemIndex];
    if (!selected || !selected.serialNumbers) return;

    this.model22.items[itemIndex].serialNumbers.push('');
    this.serialControls[itemIndex].push(new FormControl('', Validators.required));
    this.filteredSerials[itemIndex].push(this.setupSerialFilter(itemIndex, this.model22.items[itemIndex].serialNumbers.length - 1));
    this.serialNumberErrors[itemIndex].push('');
    this.showSuggestions[itemIndex][this.model22.items[itemIndex].serialNumbers.length - 1] = false;
  }

  removeSerialNumber(itemIndex: number, serialIndex: number): void {
    if (this.model22.items[itemIndex].serialNumbers.length > 1) {
      this.model22.items[itemIndex].serialNumbers.splice(serialIndex, 1);
      this.serialControls[itemIndex].splice(serialIndex, 1);
      this.filteredSerials[itemIndex].splice(serialIndex, 1);
      this.serialNumberErrors[itemIndex].splice(serialIndex, 1);

      if (this.showSuggestions[itemIndex]) {
        delete this.showSuggestions[itemIndex][serialIndex];
        const newSuggestions: { [key: number]: boolean } = {};
        Object.keys(this.showSuggestions[itemIndex]).forEach((key: string) => {
          const keyNum = parseInt(key);
          if (keyNum < serialIndex) {
            newSuggestions[keyNum] = this.showSuggestions[itemIndex][keyNum];
          } else if (keyNum > serialIndex) {
            newSuggestions[keyNum - 1] = this.showSuggestions[itemIndex][keyNum];
          }
        });
        this.showSuggestions[itemIndex] = newSuggestions;
      }
    }
  }

  canAddMoreSerials(itemIndex: number): boolean {
    const selected = this.selectedItem[itemIndex];
    if (!selected || !selected.serialNumbers) return false;

    const currentSerialsCount = this.model22.items[itemIndex].serialNumbers.length;
    const availableSerialsCount = selected.serialNumbers.length;

    if (this.model22.role === 'SPAREPART') {
      return currentSerialsCount < availableSerialsCount;
    }

    return currentSerialsCount < Math.min(availableSerialsCount, 10);
  }

  getMaxSerialsForItem(itemIndex: number): number {
    const selected = this.selectedItem[itemIndex];
    if (!selected || !selected.serialNumbers) return 0;

    if (this.model22.role === 'SPAREPART') {
      return selected.serialNumbers.length;
    }

    return Math.min(selected.serialNumbers.length, 10);
  }

  getAvailableSerialNumbers(index: number): string {
    const selected = this.selectedItem[index];
    if (!selected || !selected.serialNumbers) {
      return '';
    }
    return selected.serialNumbers.map(sn => sn.serialNumber).join(', ');
  }

  getSelectedAccessoriesCount(itemIndex: number): number {
    return this.model22.items[itemIndex].selectedAccessories.filter(a => a.quantity > 0).length;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid || !this.model22.role || !this.model22.registeredBy || this.model22.registeredBy === 'Unknown') {
      this.errorMessage = 'Please fill out all required fields including role and registered by.';
      this.errorDetails = [];
      console.warn('Model22Registration: Submission failed - invalid form or missing registeredBy');
      return;
    }

    // Debug accessory data before validation
    this.debugAccessoryData();
    this.debugAccessoryDataBeforeSubmit(); // Add this for detailed logging
    
    if (!this.validateItems()) {
      return;
    }

    this.submitted = true;
    this.submitFormData();
  }

  private validateItems(): boolean {
    this.errorDetails = [];

    for (let i = 0; i < this.model22.items.length; i++) {
      const item = this.model22.items[i];
      const selected = this.selectedItem[i];
      const quantityControl = this.quantityControls[i];
      const isAccessoryOnly = this.withdrawalTypeControls[i]?.value === 'accessory-only';

      if (!item.description || !item.model || !item.currency) {
        this.errorMessage = 'All item fields are required. Currency must be valid.';
        this.errorDetails.push(`Item ${i + 1}: Missing description, model, or currency.`);
        return false;
      }

      // Quantity validation - skip for accessory-only mode
      if (!isAccessoryOnly && !quantityControl.valid) {
        this.errorMessage = 'Quantity must be valid for regular item withdrawals.';
        this.errorDetails.push(`Item ${i + 1}: Invalid quantity.`);
        return false;
      }

      if (!['ETB', 'POUND', 'USD', 'EURO', 'FOC'].includes(item.currency)) {
        this.errorMessage = `Invalid currency for item ${i + 1}. Must be one of: ETB, POUND, USD, EURO, FOC.`;
        this.errorDetails.push(`Item ${i + 1}: Invalid currency (${item.currency}).`);
        return false;
      }

      if (!selected) {
        this.errorMessage = `Please select an item for position ${i + 1}.`;
        this.errorDetails.push(`Item ${i + 1}: No item selected.`);
        return false;
      }

      // Stock validation - skip for accessory-only mode
      if (!isAccessoryOnly && quantityControl.value > selected.quantity) {
        this.errorMessage = `Quantity for ${selected.description} exceeds available stock (${selected.quantity})`;
        this.errorDetails.push(`Item ${i + 1}: Quantity (${quantityControl.value}) exceeds available stock (${selected.quantity}).`);
        return false;
      }

      // Validate accessory-only mode requirements
      if (isAccessoryOnly) {
        const hasSelectedAccessories = item.selectedAccessories && item.selectedAccessories.some(a => a.quantity > 0);
        if (!hasSelectedAccessories) {
          this.errorMessage = `Accessory-only mode requires at least one accessory to be selected for item ${i + 1}.`;
          this.errorDetails.push(`Item ${i + 1}: No accessories selected in accessory-only mode.`);
          return false;
        }
      }

      // Validate accessory quantities and serial numbers
      if ((this.useAccessories || isAccessoryOnly) && selected.accessories) {
        for (const accessorySelection of item.selectedAccessories) {
          const accessory = selected.accessories.find(a => a.id === accessorySelection.accessoryId);
          if (accessory && accessorySelection.quantity > accessory.quantity) {
            this.errorMessage = `Quantity for accessory ${accessory.name} exceeds available stock (${accessory.quantity})`;
            this.errorDetails.push(`Item ${i + 1}: Accessory ${accessory.name} quantity (${accessorySelection.quantity}) exceeds available stock (${accessory.quantity}).`);
            return false;
          }

          // Validate accessory serial numbers if required
          if (accessory && accessory.requiresSerialNumbers) {
            console.log(`🔧 Validating accessory ${accessory.name}: requires serials=${accessory.requiresSerialNumbers}, qty=${accessorySelection.quantity}, serials count=${accessorySelection.serialNumbers?.length}`);

            if (!accessorySelection.serialNumbers || accessorySelection.serialNumbers.length === 0) {
              this.errorMessage = `Accessory ${accessory.name} requires serial numbers but none provided (Count: ${accessorySelection.serialNumbers?.length ?? 'null'}).`;
              this.errorDetails.push(`Item ${i + 1}: Accessory ${accessory.name} requires serial numbers.`);
              return false;
            }

            if (accessorySelection.quantity !== accessorySelection.serialNumbers.length) {
              this.errorMessage = `Accessory ${accessory.name} quantity (${accessorySelection.quantity}) must match serial numbers count (${accessorySelection.serialNumbers.length}).`;
              this.errorDetails.push(`Item ${i + 1}: Accessory ${accessory.name} quantity mismatch.`);
              return false;
            }

            // Check for empty serial numbers
            for (let j = 0; j < accessorySelection.serialNumbers.length; j++) {
              if (!accessorySelection.serialNumbers[j] || accessorySelection.serialNumbers[j].trim() === '') {
                this.errorMessage = `All serial numbers for accessory ${accessory.name} must be filled.`;
                this.errorDetails.push(`Item ${i + 1}: Accessory ${accessory.name} serial number ${j + 1} is empty.`);
                return false;
              }
            }

            // Check for duplicate serial numbers within the accessory
            const uniqueSerials = new Set(accessorySelection.serialNumbers);
            if (uniqueSerials.size !== accessorySelection.serialNumbers.length) {
              this.errorMessage = `Duplicate serial numbers detected for accessory ${accessory.name}.`;
              this.errorDetails.push(`Item ${i + 1}: Accessory ${accessory.name} has duplicate serial numbers.`);
              return false;
            }

            // Validate that serial numbers exist for this accessory
            for (const serial of accessorySelection.serialNumbers) {
              const serialExists = accessory.serialNumbers?.some(s => s.serialNumber === serial);
              if (!serialExists) {
                this.errorMessage = `Serial number ${serial} not found for accessory ${accessory.name}.`;
                this.errorDetails.push(`Item ${i + 1}: Accessory ${accessory.name} serial number ${serial} not found.`);
                return false;
              }
            }
          }
        }
      }

      // Validate parent item serial numbers (skip in accessory-only mode)
      const role = this.model22.role;
      if (!isAccessoryOnly && selected.serialNumbers && selected.serialNumbers.length > 0 && item.serialNumbers.length > 0) {
        let expectedSerialCount: number;
        if (role === 'SPAREPART') {
          expectedSerialCount = item.serialNumbers.length;
          if (expectedSerialCount < 1) {
            this.errorMessage = `Item ${selected.description} must have at least 1 serial number.`;
            this.errorDetails.push(`Item ${i + 1}: Expected at least 1 serial number, got ${expectedSerialCount}.`);
            return false;
          }
        } else {
          expectedSerialCount = quantityControl.value;
          if (item.serialNumbers.length !== expectedSerialCount) {
            this.errorMessage = `Item ${selected.description} must have ${expectedSerialCount} serial numbers.`;
            this.errorDetails.push(`Item ${i + 1}: Expected ${expectedSerialCount} serial numbers, got ${item.serialNumbers.length}.`);
            return false;
          }
        }

        for (let j = 0; j < item.serialNumbers.length; j++) {
          const serial = item.serialNumbers[j];
          if (!serial) {
            this.errorMessage = `Serial number is required for item ${selected.description} at position ${j + 1}`;
            this.serialNumberErrors[i][j] = 'Serial number is required';
            this.errorDetails.push(`Item ${i + 1}: Serial number ${j + 1} is empty.`);
            return false;
          }

          const serialExists = selected.serialNumbers.some((sn: ItemSerialNumber) => sn.serialNumber === serial);
          if (!serialExists) {
            this.errorMessage = `Serial number ${serial} not found for item ${selected.description}`;
            this.serialNumberErrors[i][j] = `Serial number ${serial} not found`;
            this.errorDetails.push(`Item ${i + 1}: Serial number ${serial} not found.`);
            return false;
          }
        }

        const uniqueSerials = new Set(item.serialNumbers);
        if (uniqueSerials.size !== item.serialNumbers.length) {
          this.errorMessage = `Duplicate serial numbers detected for item ${selected.description}`;
          this.errorDetails.push(`Item ${i + 1}: Duplicate serial numbers detected.`);
          return false;
        }
      }
    }
    return true;
  }

  private submitFormData(): void {
    // Prepare the payload for accessories endpoint
    const payload: Model22WithAccessoriesRequest = {
      voucherNumber: this.model22.voucherNumber,
      department: this.model22.department,
      recipientName: this.model22.recipientName,
      recipientOrganization: this.model22.recipientOrganization,
      ethiopianDate: this.normalizeEthiopianDate(this.model22.ethiopianDate),
      role: this.model22.role,
      registeredBy: this.model22.registeredBy,
      items: this.model22.items.map((item: Model22ItemWithAccessoriesRequest, index: number) => {
        const selectedItem = this.selectedItem[index];
        const isAccessoryOnly = this.withdrawalTypeControls[index]?.value === 'accessory-only';

        // Build the item with accessories
        const cleanSerials = isAccessoryOnly
          ? []
          : item.serialNumbers.filter((s: string) => s && s.trim() !== '');

        const itemWithAccessories: Model22ItemWithAccessoriesRequest = {
          description: item.description,
          model: item.model,
          quantity: isAccessoryOnly ? 0 : this.quantityControls[index].value,
          unitPrice: item.unitPrice,
          currency: this.currencyControls[index].value,
          serialNumbers: cleanSerials,
          voucherNumber: this.model22.voucherNumber,
          isAccessoryOnly: isAccessoryOnly,
          parentItemId: selectedItem?.itemId,
          selectedAccessories: []
        };

        // Add selected accessories if any (for both useAccessories and accessory-only modes)
        const hasAccessories = (this.useAccessories || isAccessoryOnly) && selectedItem?.accessories && item.selectedAccessories?.length > 0;
        if (hasAccessories) {
          itemWithAccessories.selectedAccessories = item.selectedAccessories
            .filter(accessory => accessory.quantity > 0)
            .map(accessory => {
              const accessoryInfo = selectedItem!.accessories?.find(a => a.id === accessory.accessoryId);
              const accessoryPayload: any = {
                accessoryId: accessory.accessoryId,
                quantity: accessory.quantity,
                unitPrice: accessory.unitPrice,
                currency: accessory.currency
              };
              if (accessoryInfo?.requiresSerialNumbers && accessory.serialNumbers) {
                accessoryPayload.serialNumbers = accessory.serialNumbers;
              }
              return accessoryPayload;
            });
        }

        return itemWithAccessories;
      })
    };

    console.log('Model22Registration: Submitting payload:', JSON.stringify(payload, null, 2));

    // Always use createWithAccessories — it handles regular, accessory, and accessory-only modes
    this.model22Service.createWithAccessories(payload).subscribe({
      next: (response: ApiResponse<{ model22Id: number }>) => {
        this.handleResponse(response);
      },
      error: (err: any) => {
        this.handleError(err);
      }
    });
  }

  private handleResponse(response: ApiResponse<{ model22Id: number }>): void {
    console.log('Model22Registration: Full API Response:', response);

    if (response.success && response.data?.model22Id) {
      console.log('Created Model22 ID:', response.data.model22Id);

      // Fetch the created record to verify accessories were saved
      this.model22Service.getModel22(response.data.model22Id).subscribe({
        next: (createdModel22) => {
          console.log('Created Model22 with accessories:', createdModel22);
          this.handleSuccess();
        },
        error: (err) => {
          console.error('Error fetching created Model22:', err);
          this.handleSuccess();
        }
      });
    } else {
      this.errorMessage = response.message || 'Failed to create Model22';
      this.errorDetails = response.errors || ['No additional details provided'];
      this.submitted = false;
    }
  }

  private handleError(err: any): void {
    console.error('Model22Registration: Error:', err);
    // Try to extract the most useful message from the error
    const serverMsg = err.error?.message || err.error?.detailedMessage || err.error;
    const errMsg = typeof serverMsg === 'string' ? serverMsg : null;

    this.errorMessage = err.status === 400
      ? (errMsg || 'Invalid request')
      : errMsg
        ? errMsg
        : err.message?.includes('Warehouse')
          ? `Invalid warehouse for role ${this.model22.role}`
          : err.message?.includes('Category')
            ? `One or more categories do not exist`
            : err.message?.includes('Currency')
              ? `Invalid currency provided`
              : 'An error occurred while creating the withdrawal';
    this.errorDetails = err.error?.errors || (errMsg ? [] : [err.error?.detailedMessage || err.message || 'No additional error details provided']);
    this.submitted = false;
  }

  private normalizeEthiopianDate(date: string): string {
    return date.replace(/\s+/, ', ');
  }

  private handleSuccess(): void {
    this.successMessage = 'Withdrawal registered successfully!';
    this.errorMessage = null;
    this.errorDetails = [];
    setTimeout(() => {
      this.router.navigate(['/model22-list']);
    }, 2000);
  }

  debugAccessoryData(): void {
    console.log('=== DEBUG: Accessory Data ===');
    console.log('Use Accessories:', this.useAccessories);

    this.model22.items.forEach((item, index) => {
      console.log(`Item ${index + 1} (${item.description}):`);
      console.log('- Selected accessories:', item.selectedAccessories);
      console.log('- Accessory controls:', this.accessoryControls[index]);

      // DEBUG MAIN ITEM SERIAL NUMBERS
      console.log('🔍 MAIN ITEM SERIAL NUMBERS DEBUG:');
      console.log(`  - item.serialNumbers array:`, item.serialNumbers);
      console.log(`  - item.serialNumbers.length:`, item.serialNumbers?.length || 0);
      console.log(`  - serialControls[${index}]:`, this.serialControls[index]);

      if (this.serialControls[index]) {
        this.serialControls[index].forEach((control, serialIndex) => {
          console.log(`    Serial Control ${serialIndex}: value="${control.value}", valid=${control.valid}`);
        });
      }

      if (this.selectedItem[index]?.serialNumbers) {
        console.log(`  - Available serial numbers:`, this.selectedItem[index]?.serialNumbers);
      }

      if (this.selectedItem[index]?.accessories) {
        console.log('- Available accessories:', this.selectedItem[index]?.accessories);
      }

      // Debug each accessory selection in detail
      item.selectedAccessories.forEach((selection, selIndex) => {
        console.log(`  Accessory Selection ${selIndex + 1}:`);
        console.log(`    - AccessoryId: ${selection.accessoryId}`);
        console.log(`    - Quantity: ${selection.quantity}`);
        console.log(`    - Serial Numbers Array:`, selection.serialNumbers);
        console.log(`    - Serial Numbers Length: ${selection.serialNumbers?.length || 0}`);

        if (selection.serialNumbers) {
          selection.serialNumbers.forEach((serial, serialIndex) => {
            console.log(`      Serial ${serialIndex + 1}: "${serial}" (empty: ${!serial || serial.trim() === ''})`);
          });
        }
      });
    });
    console.log('=== END DEBUG ===');
  }

  debugAccessoryDataBeforeSubmit(): void {
    console.log('=== DEBUG BEFORE SUBMIT: Accessory Data ===');
    
    this.model22.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`);
      
      item.selectedAccessories.forEach((selection, selIndex) => {
        console.log(`  Accessory Selection ${selIndex + 1}:`);
        console.log(`    - AccessoryId: ${selection.accessoryId}`);
        console.log(`    - Quantity: ${selection.quantity}`);
        console.log(`    - Serial Numbers:`, selection.serialNumbers);
        console.log(`    - Serial Numbers Array Length: ${selection.serialNumbers?.length || 0}`);
        
        // Find the accessory to check if it requires serial numbers
        const selectedItem = this.selectedItem[index];
        const accessoryInfo = selectedItem?.accessories?.find(a => a.id === selection.accessoryId);
        console.log(`    - Accessory Info:`, accessoryInfo);
        console.log(`    - Requires Serial Numbers: ${accessoryInfo?.requiresSerialNumbers}`);
      });
    });
    console.log('=== END DEBUG ===');
  }

  displayItem(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return `${item.description || 'Unknown Item'} (${item.model || 'No Model'})`;
  }

  // Helper methods for accessory serial numbers
  getAccessorySelection(itemIndex: number, accessoryId: number): any {
    return this.model22.items[itemIndex].selectedAccessories.find(a => a.accessoryId === accessoryId);
  }

  getAccessorySerialNumber(itemIndex: number, accessoryId: number, serialIndex: number): string {
    const selection = this.getAccessorySelection(itemIndex, accessoryId);
    return selection?.serialNumbers?.[serialIndex] || '';
  }

  setAccessorySerialNumber(itemIndex: number, accessoryId: number, serialIndex: number, value: string): void {
    const selection = this.getAccessorySelection(itemIndex, accessoryId);
    if (selection && selection.serialNumbers) {
      selection.serialNumbers[serialIndex] = value;
      console.log(`🔧 Set accessory serial: Item ${itemIndex}, Accessory ${accessoryId}, Serial ${serialIndex} = "${value}"`);
      console.log(`🔧 Updated serial numbers array:`, selection.serialNumbers);
    }
  }

  isAccessorySerialNumberUsed(itemIndex: number, accessoryId: number, serialNumber: string, currentIndex: number): boolean {
    const selection = this.getAccessorySelection(itemIndex, accessoryId);
    if (!selection || !selection.serialNumbers) return false;

    // Check if this serial number is used in other positions within the same accessory
    return selection.serialNumbers.some((serial: string, index: number) =>
      serial === serialNumber && index !== currentIndex
    );
  }

  areAllAccessorySerialNumbersFilled(itemIndex: number, accessoryId: number): boolean {
    const selection = this.getAccessorySelection(itemIndex, accessoryId);
    if (!selection || !selection.serialNumbers) return false;

    if (selection.quantity > 0 && selection.serialNumbers.length === 0) return false;

    return selection.serialNumbers.every((serial: string) => serial && serial.trim() !== '');
  }

  // Update accessory unit price during withdrawal
  updateAccessoryPrice(itemIndex: number, accessoryId: number, price: string): void {
    const selection = this.getAccessorySelection(itemIndex, accessoryId);
    if (selection) {
      selection.unitPrice = parseFloat(price) || 0;
      console.log(`Updated accessory ${accessoryId} price to ${selection.unitPrice}`);
    }
  }

  // Update accessory currency during withdrawal
  updateAccessoryCurrency(itemIndex: number, accessoryId: number, currency: string): void {
    const selection = this.getAccessorySelection(itemIndex, accessoryId);
    if (selection) {
      selection.currency = currency;
      console.log(`Updated accessory ${accessoryId} currency to ${selection.currency}`);
    }
  }

  // Handle withdrawal type change (regular vs accessory-only)
  onWithdrawalTypeChange(index: number, type: string): void {
    console.log(`Withdrawal type changed for item ${index}: ${type}`);
    
    const item = this.model22.items[index];
    item.isAccessoryOnly = (type === 'accessory-only');
    
    if (item.isAccessoryOnly) {
      // Accessory-only mode: quantity is not required for parent item
      this.quantityControls[index].clearValidators();
      this.quantityControls[index].setValue(0);
      this.quantityControls[index].disable();
      
      // Clear serial numbers for parent item
      this.serialControls[index] = [];
      this.filteredSerials[index] = [];
      this.serialNumberErrors[index] = [];
      item.serialNumbers = [];
      
      // Force accessories to be shown
      this.useAccessories = true;
    } else {
      // Regular mode: quantity is required
      this.quantityControls[index].setValidators([Validators.required, Validators.min(1)]);
      this.quantityControls[index].setValue(1);
      this.quantityControls[index].enable();
      
      // Update max validator if item is selected
      const selected = this.selectedItem[index];
      if (selected) {
        this.quantityControls[index].setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(selected.quantity)
        ]);
      }
    }
    
    this.quantityControls[index].updateValueAndValidity();
    
    // Clear selected item and reset
    this.selectedItem[index] = null;
    this.searchControls[index].setValue('');
    item.description = '';
    item.model = '';
    item.selectedAccessories = [];
    this.accessoryControls[index] = {};
  }

  // Check if item is in accessory-only mode
  isAccessoryOnlyMode(index: number): boolean {
    return this.withdrawalTypeControls[index]?.value === 'accessory-only';
  }

  // Get label for withdrawal type
  getWithdrawalTypeLabel(index: number): string {
    return this.isAccessoryOnlyMode(index) ? 'Accessory Only' : 'Regular Item';
  }

  // Update all selected accessories' currency when parent item currency changes
  private updateAccessoriesCurrency(itemIndex: number, newCurrency: string): void {
    if (this.model22.items[itemIndex]?.selectedAccessories) {
      this.model22.items[itemIndex].selectedAccessories.forEach(acc => {
        acc.currency = newCurrency;
      });
      console.log(`Updated all accessories for item ${itemIndex} to currency: ${newCurrency}`);
    }
  }

  // TrackBy function for accessories to prevent duplicate rendering
  trackByAccessoryId(index: number, accessory: any): number {
    return accessory.id;
  }
}