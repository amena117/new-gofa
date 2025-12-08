import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MasterCardService, Organization, Location } from '../../../services/mastercard.service';
import { MasterCardItem, MasterCardItemReceived, ReceivedAccessory } from '../../models/mastercard.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-add-master-card-received',
  templateUrl: './add-master-card-received.component.html',
  styleUrls: ['./add-master-card-received.component.css']
})
export class AddMasterCardReceivedComponent implements OnInit {
  itemId: number | null = null;
  currentStock: number | null = null;
  isSubmitting = false;
  errorMessage: string | null = null;
  warningMessage: string | null = null;
  receivedItem: MasterCardItemReceived | null = null;
  availableAccessories: string[] = [];
  receivedRecords: MasterCardItemReceived[] = [];
  organizations: Organization[] = [];
  locations: Location[] = [];
  showOrganizationModal = false;
  showLocationModal = false;
  newOrganizationName = '';
  newLocationName = '';
  organizationModalError: string | null = null;
  locationModalError: string | null = null;

  currencyOptions = [
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'ETB', label: 'Ethiopian Birr (ETB)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' }
  ];

  private ethMonthNames = [
    'መስከረም', 'ጥቅምት', 'ሕዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ',
    'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  ethiopianDateString: string = '';
  private userFirstName: string = '';
  private userLastName: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private masterCardService: MasterCardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.itemId = +idParam;
      this.userFirstName = this.authService.getFirstName() ?? 'Guest';
      this.userLastName = this.authService.getLastName() ?? 'User';
      console.log(`User initialized: ${this.userFirstName} ${this.userLastName}`);
      this.receivedItem = this.createEmptyItem();
      console.log('receivedItem initialized:', this.receivedItem);
      this.loadItemDetails();
      this.loadOrganizations();
      this.loadLocations();
      // Load backend date and set Ethiopian string
      this.loadCurrentDateFromBackend();
    } else {
      this.errorMessage = 'እባክዎን ትክክለኛውን ንጥል መለያ ይግለጹ።';
    }
  }

  // Load current date from backend and convert to Ethiopian
  loadCurrentDateFromBackend(): void {
    this.masterCardService.getCurrentDate().pipe(
      catchError((err: any) => {
        console.error('Error loading date from backend, falling back to local date:', err);
        // Fallback to local current date if backend fails
        const localDate = new Date();
        this.setEthiopianDateString(localDate);
        return of({ date: localDate.toISOString() });
      })
    ).subscribe({
      next: (response: { date: string }) => {
        // Parse backend date (assume ISO string; adjust if it's YYYY-MM-DD or timestamp)
        const gregorianDate = new Date(response.date);
        if (isNaN(gregorianDate.getTime())) {
          console.error('Invalid date from backend:', response.date);
          // Fallback to local
          this.setEthiopianDateString(new Date());
          return;
        }
        this.setEthiopianDateString(gregorianDate);
        console.log('Backend date converted to Ethiopian:', this.ethiopianDateString);
      },
      error: (err: any) => {
        console.error('Unexpected error loading backend date:', err);
        // Fallback to local
        this.setEthiopianDateString(new Date());
      }
    });
  }

  // Convert Gregorian Date to Ethiopian string using custom logic
  private setEthiopianDateString(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.ethiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  // Custom Ethiopian conversion (with updated reference for accuracy)
  private toEthiopian(date: Date): { year: number; month: number; day: number } {
    // Updated reference: Sep 11, 2024 Gregorian = Meskerem 2, 2017 Ethiopian
    const REFERENCE_GREGORIAN = new Date(2024, 8, 11);  // Month 8 = September (0-indexed)
    const REFERENCE_ETH_YEAR = 2017;
    const diffInMs = date.getTime() - REFERENCE_GREGORIAN.getTime();
    let totalDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    let ethYear = REFERENCE_ETH_YEAR;
    if (totalDays >= 0) {
      while (totalDays >= (this.isLeapYear(ethYear) ? 366 : 365)) {
        totalDays -= this.isLeapYear(ethYear) ? 366 : 365;
        ethYear++;
      }
    } else {
      while (totalDays < 0) {
        ethYear--;
        totalDays += this.isLeapYear(ethYear) ? 366 : 365;
      }
    }
    // Ethiopian months: 12 months of 30 days + Pagumen (5 or 6 days)
    let ethMonth = Math.floor(totalDays / 30) + 1;  // Use 'let' to allow reassignment
    let ethDay = (totalDays % 30) + 1;
    // Handle Pagumen overflow (if month >13 or day exceeds Pagumen length)
    if (ethMonth > 13) {
      // Carry over to next year
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - 5;  // Subtract Pagumen days (approximate carry-over)
      if (this.isLeapYear(ethYear - 1)) ethDay -= 1;  // Leap Pagumen has 6 days
    } else if (ethMonth === 13 && ethDay > (this.isLeapYear(ethYear) ? 6 : 5)) {
      // Invalid day in Pagumen; carry to next year Meskerem
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - (this.isLeapYear(ethYear - 1) ? 6 : 5);
    }
    return { year: ethYear, month: ethMonth, day: ethDay };
  }

  private isLeapYear(year: number): boolean {
    return year % 4 === 0;
  }

  private createEmptyItem(): MasterCardItemReceived {
    return {
      id: 0,
      masterCardItemId: this.itemId || 0,
      date: new Date(),  // Still uses Gregorian Date for form/backend
      voucherNo: '',
      received: 0,
      organization: '',
      postedBy: `${this.userFirstName} ${this.userLastName}`.trim(),
      location: '',
      inStock: 0,
      unitPrice: 0,
      totalPrice: 0,
      currencyCode: 'USD',
      hasAccessories: false,
      receivedAccessories: []
    };
  }

  loadItemDetails(): void {
    this.masterCardService.getMasterCardItemWithReceived(this.itemId!).subscribe({
      next: (item: MasterCardItem) => {
        this.currentStock = item.quantity;
        this.receivedRecords = item.receivedRecords || [];
        const accessorySet = new Set<string>();
        this.receivedRecords.forEach((received: MasterCardItemReceived) => {
          received.receivedAccessories?.forEach((acc: ReceivedAccessory) => {
            if (acc.name) accessorySet.add(acc.name);
          });
        });
        this.availableAccessories = Array.from(accessorySet);
        console.log('Available accessories:', this.availableAccessories);
      },
      error: (err: any) => {
        console.error('Error loading item details:', err);
        this.errorMessage = 'የንጥል መረጃ መጫን አልተሳካም።';
      }
    });
  }

  loadOrganizations(): void {
    this.masterCardService.getOrganizations().subscribe({
      next: (orgs: Organization[]) => {
        this.organizations = orgs;
        console.log('Organizations loaded:', orgs);
      },
      error: (err: any) => {
        console.error('Error loading organizations:', err);
        this.errorMessage = 'ድርጅቶችን መጫን አልተሳካም።';
      }
    });
  }

  loadLocations(): void {
    this.masterCardService.getLocations().subscribe({
      next: (locs: Location[]) => {
        this.locations = locs;
        console.log('Locations loaded:', locs);
      },
      error: (err: any) => {
        console.error('Error loading locations:', err);
        this.errorMessage = 'ቦታዎችን መጫን አልተሳካም።';
      }
    });
  }

  openOrganizationModal(): void {
    this.showOrganizationModal = true;
    this.newOrganizationName = '';
    this.organizationModalError = null;
  }

  closeOrganizationModal(): void {
    this.showOrganizationModal = false;
    this.newOrganizationName = '';
    this.organizationModalError = null;
  }

  createOrganization(): void {
    if (!this.newOrganizationName.trim()) {
      this.organizationModalError = 'የድርጅት ስም ያስፈልጋል።';
      return;
    }
    const newOrg: Organization = { id: 0, name: this.newOrganizationName.trim() };
    this.masterCardService.addOrganization(newOrg).subscribe({
      next: (orgs: Organization[]) => {
        this.organizations = orgs;
        if (this.receivedItem) {
          const newOrg = orgs.find((org: Organization) => org.name === this.newOrganizationName.trim());
          if (newOrg) {
            this.receivedItem.organization = newOrg.name;
          }
        }
        this.closeOrganizationModal();
        console.log('Organization list updated:', orgs);
      },
      error: (err: any) => {
        console.error('Error creating organization:', err);
        this.organizationModalError = err.error?.error || 'ድርጅት መፍጠር አልተሳካም።';
      }
    });
  }

  openLocationModal(): void {
    this.showLocationModal = true;
    this.newLocationName = '';
    this.locationModalError = null;
  }

  closeLocationModal(): void {
    this.showLocationModal = false;
    this.newLocationName = '';
    this.locationModalError = null;
  }

  createLocation(): void {
    if (!this.newLocationName.trim()) {
      this.locationModalError = 'የቦታ ስም ያስፈልጋል።';
      return;
    }
    const newLoc: Location = { id: 0, name: this.newLocationName.trim() };
    this.masterCardService.addLocation(newLoc).subscribe({
      next: (locs: Location[]) => {
        this.locations = locs;
        if (this.receivedItem) {
          const newLoc = locs.find((loc: Location) => loc.name === this.newLocationName.trim());
          if (newLoc) {
            this.receivedItem.location = newLoc.name;
          }
        }
        this.closeLocationModal();
        console.log('Location list updated:', locs);
      },
      error: (err: any) => {
        console.error('Error creating location:', err);
        this.locationModalError = err.error?.error || 'ቦታ መፍጠር አልተሳካም።';
      }
    });
  }

  addNewAccessory(): void {
    if (!this.receivedItem) {
      this.errorMessage = 'ንጥል ገና አልተጀመረም።';
      return;
    }
    this.receivedItem.receivedAccessories = this.receivedItem.receivedAccessories || [];
    this.receivedItem.receivedAccessories.push({
      id: 0,
      name: '',
      quantity: 1,
      masterCardItemReceivedId: 0
    });
    this.receivedItem.hasAccessories = true;
    console.log(`Added accessory. Total accessories: ${this.receivedItem.receivedAccessories.length}`);
  }

  removeAccessory(accessoryIndex: number): void {
    if (!this.receivedItem || !this.receivedItem.receivedAccessories) {
      this.errorMessage = 'ንጥል ወይም አክሲዮሰሶሮች አልተገኙም።';
      return;
    }
    if (this.receivedItem.receivedAccessories.length > accessoryIndex) {
      this.receivedItem.receivedAccessories.splice(accessoryIndex, 1);
      if (this.receivedItem.receivedAccessories.length === 0) {
        this.receivedItem.hasAccessories = false;
      }
      console.log(`Removed accessory. Total accessories: ${this.receivedItem.receivedAccessories.length}`);
    }
  }

  toggleAccessoriesSection(): void {
    if (!this.receivedItem) {
      this.errorMessage = 'ንጥል ገና አልተጀመረም።';
      return;
    }
    this.receivedItem.receivedAccessories = this.receivedItem.receivedAccessories || [];
    if (!this.receivedItem.hasAccessories) {
      this.receivedItem.receivedAccessories = [];
    } else if (this.receivedItem.receivedAccessories.length === 0) {
      this.addNewAccessory();
    }
  }

  onAccessorySelected(accessoryIndex: number): void {
    if (!this.receivedItem || !this.receivedItem.receivedAccessories) return;
    const selected = this.receivedItem.receivedAccessories[accessoryIndex];
    if (selected?.name) {
      selected.quantity = 1;
      // No validation for received accessories (no max limit)
    }
  }

  isAccessoryAlreadySelected(name: string, currentIndex: number): boolean {
    return this.receivedItem?.receivedAccessories?.some((acc: ReceivedAccessory, i: number) => acc.name === name && i !== currentIndex) || false;
  }

  updateTotalPrice(): void {
    if (!this.receivedItem) {
      this.errorMessage = 'ንጥል ገና አልተጀመረም።';
      return;
    }
    this.receivedItem.totalPrice = Number((this.receivedItem.received * this.receivedItem.unitPrice).toFixed(2));
  }

  onSubmit(): void {
    if (this.isSubmitting || !this.receivedItem) {
      this.errorMessage = this.receivedItem ? 'ቀድሞ በመዝገብ ላይ ነው።' : 'ንጥል ገና አልተጀመረም።';
      this.isSubmitting = false;
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = null;
    this.warningMessage = null;

    if (!(this.receivedItem.date instanceof Date) || isNaN(this.receivedItem.date.getTime())) {
      this.errorMessage = 'የደረሰበት ቀን ትክክል አይደለም።';
      this.isSubmitting = false;
      return;
    }

    if (!this.validateItem(this.receivedItem)) {
      this.isSubmitting = false;
      return;
    }

    const payload: MasterCardItemReceived = {
      id: this.receivedItem.id,
      masterCardItemId: this.itemId || 0,
      date: this.receivedItem.date,
      voucherNo: this.receivedItem.voucherNo,
      received: this.receivedItem.received,
      organization: this.receivedItem.organization,
      postedBy: this.receivedItem.postedBy,
      location: this.receivedItem.location,
      inStock: (this.currentStock || 0) + this.receivedItem.received,
      unitPrice: this.receivedItem.unitPrice,
      totalPrice: Number((this.receivedItem.received * this.receivedItem.unitPrice).toFixed(2)),
      currencyCode: this.receivedItem.currencyCode,
      hasAccessories: this.receivedItem.hasAccessories,
      receivedAccessories: this.receivedItem.hasAccessories && this.receivedItem.receivedAccessories
        ? this.receivedItem.receivedAccessories.filter((a: ReceivedAccessory) => a.name && a.quantity > 0)
        : []
    };

    console.log('Submitting item:', payload);

    this.masterCardService.addMasterCardItemReceived(this.itemId!, payload).pipe(
      catchError((err: any) => {
        console.error(`Error submitting item with VoucherNo ${payload.voucherNo}:`, err);
        this.errorMessage = `ስህተት ለንጥል ${payload.voucherNo}: ${err.error?.error || 'Unknown error'}`;
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe({
      next: (response: MasterCardItemReceived | null) => {
        this.isSubmitting = false;
        if (response) {
          console.log('Item submitted successfully:', response);
          this.loadItemDetails();
          this.router.navigate(['/MasterCard/mastercard-list']);
        } else {
          this.errorMessage = this.errorMessage || 'ንጥል መዝገብ አልተሳካም።';
        }
      },
      error: (err: any) => {
        console.error('Unexpected error:', err);
        this.errorMessage = 'የመዝገብ ስህተት ተፈጥሯል።';
        this.isSubmitting = false;
      }
    });
  }

  private validateItem(item: MasterCardItemReceived): boolean {
    if (this.itemId === null || this.itemId === 0) {
      this.errorMessage = 'እባክዎን ትክክለኛውን ንጥል መለያ ይግለጹ።';
      return false;
    }
    if (
      !item.voucherNo?.trim() ||
      item.received <= 0 ||
      !item.organization?.trim() ||
      !item.location?.trim() ||
      item.unitPrice < 0
    ) {
      this.errorMessage = 'እባክዎን ሁሉንም መረጃዎች በትክክል ይሙሉ።';
      return false;
    }

    // const duplicate = this.receivedRecords.some(
    //   r => r.voucherNo.trim() === item.voucherNo.trim() && r.id !== item.id
    // );
    // if (duplicate) {
    //   this.errorMessage = `ቫውቸር ቁጥር "${item.voucherNo}" ቀድሞ ተመዝግቧል። እባክዎ ሌላ ቫውቸር ቁጥር ይምረጡ።`;
    //   return false;
    // }

    if (item.hasAccessories && item.receivedAccessories && item.receivedAccessories.length > 0) {
      const validAccs = item.receivedAccessories.filter((a: ReceivedAccessory) => a.name?.trim() && a.quantity > 0);
      if (validAccs.length === 0) {
        this.errorMessage = 'አክሲዮሰሶር መምረጥ ከፈለግተው፣ የትክክለኛ ስም እና ብዛት ያስገቡ።';
        return false;
      }
      item.receivedAccessories = validAccs;
    } else if (item.hasAccessories && (!item.receivedAccessories || item.receivedAccessories.length === 0)) {
      this.errorMessage = 'አክሲዮሰሶሮች መኖር አለባቸው የተመረጡ ከሆነ፣ የትክክለኛ ስም እና ብዛት ያስገቡ።';
      return false;
    } else {
      item.receivedAccessories = [];
    }

    return true;
  }

  cancel(): void {
    this.router.navigate(['/MasterCard/mastercard-list']);
  }

  dismissWarning(): void {
    this.warningMessage = null;
  }
}