import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MasterCardService, Organization, Location } from '../../../services/mastercard.service';
import { MasterCardItem, MasterCardItemIssued, IssuedAccessory, ReceivedAccessory, MasterCardItemReceived } from '../../models/mastercard.model';
import { AuthService } from '../../../services/auth.service';
// Removed: import { EthDateTime } from 'ethiopian-calendar-date-converter';

@Component({
  selector: 'app-add-master-card-issued',
  templateUrl: './add-master-card-issued.component.html',
  styleUrls: ['./add-master-card-issued.component.css']
})
export class AddMasterCardIssuedComponent implements OnInit {
  itemId: number | null = null;
  currentStock: number | null = null;
  isSubmitting = false;
  errorMessage: string | null = null;
  warningMessage: string | null = null;
  issuedItem: MasterCardItemIssued | null = null;
  availableAccessories: string[] = [];
  receivedRecords: MasterCardItemReceived[] = [];
  issuedRecords: MasterCardItemIssued[] = [];
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
      this.issuedItem = this.createEmptyItem();
      console.log('issuedItem initialized:', this.issuedItem);
      this.loadItemDetails();
      this.loadOrganizations();
      this.loadLocations();
      // Load backend date and set Ethiopian string
      this.loadCurrentDateFromBackend();
    } else {
      this.errorMessage = 'እባክዎን ትክክለኛውን ንጥል መለያ ይግለጹ።';
    }
  }

  // Load current date from backend and convert to Ethiopian using custom logic
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

  // Convert Gregorian Date to Ethiopian string using your custom logic
  private setEthiopianDateString(date: Date): void {
    const ethDate = this.toEthiopian(date);
    this.ethiopianDateString = `${ethDate.day} ${this.ethMonthNames[ethDate.month - 1]} ${ethDate.year}`;
  }

  // Your original custom Ethiopian conversion (with updated reference for accuracy)
  private toEthiopian(date: Date): { year: number; month: number; day: number } {
    // Updated reference for accuracy: Sep 11, 2024 Gregorian = Meskerem 2, 2017 Ethiopian
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
    let ethMonth = Math.floor(totalDays / 30) + 1;
    let ethDay = (totalDays % 30) + 1;
    // Handle Pagumen overflow (if day >5 or >6 in leap)
    if (ethMonth > 13) {
      // Carry over to next year
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - 5;  // Approximate; adjust if needed for exact
      if (this.isLeapYear(ethYear - 1)) ethDay -= 1;  // Leap Pagumen has 6 days
    } else if (ethMonth === 13 && ethDay > (this.isLeapYear(ethYear) ? 6 : 5)) {
      // Invalid day in Pagumen; carry to next year Meskerem
      ethYear++;
      ethMonth = 1;
      ethDay = ethDay - (this.isLeapYear(ethYear - 1) ? 6 : 5);
    }
    return { year: ethYear, month: ethMonth, day: ethDay };
  }

  // Your original leap year check
  private isLeapYear(year: number): boolean {
    return year % 4 === 0;
  }

  private createEmptyItem(): MasterCardItemIssued {
    return {
      id: 0,
      masterCardItemId: this.itemId || 0,
      date: new Date(),  // Still uses Gregorian Date for form/backend
      voucherNo: '',
      issued: 0,
      organization: '',
      postedBy: `${this.userFirstName} ${this.userLastName}`.trim(),
      location: '',
      inStock: 0,
      unitPrice: 0,
      totalPrice: 0,
      currencyCode: 'USD',
      hasAccessories: false,
      issuedAccessories: []
    };
  }

  // ... (rest of your methods remain unchanged)
  loadItemDetails(): void {
    this.masterCardService.getMasterCardItemWithReceived(this.itemId!).subscribe({
      next: (item: MasterCardItem) => {
        this.currentStock = item.quantity;
        this.receivedRecords = item.receivedRecords || [];
        this.issuedRecords = item.issuedRecords || [];
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
        if (this.issuedItem) {
          const newOrg = orgs.find((org: Organization) => org.name === this.newOrganizationName.trim());
          if (newOrg) {
            this.issuedItem.organization = newOrg.name;
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
        if (this.issuedItem) {
          const newLoc = locs.find((loc: Location) => loc.name === this.newLocationName.trim());
          if (newLoc) {
            this.issuedItem.location = newLoc.name;
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
    if (!this.issuedItem) {
      this.errorMessage = 'ንጥል ገና አልተጀመረም።';
      return;
    }
    this.issuedItem.issuedAccessories = this.issuedItem.issuedAccessories || [];
    const MAX_ACCESSORIES = 10; // Define max limit
    if (this.issuedItem.issuedAccessories.length < MAX_ACCESSORIES) {
      this.issuedItem.issuedAccessories.push({
        id: 0,
        name: '',
        quantity: 1
      });
      console.log(`Added accessory. Total accessories: ${this.issuedItem.issuedAccessories.length}`);
    } else {
      this.warningMessage = `ከፍተኛው የአክሲዮሰሶሮች ብዛት (${MAX_ACCESSORIES}) ተደርሷል።`;
    }
  }

  removeAccessory(accessoryIndex: number): void {
    if (!this.issuedItem || !this.issuedItem.issuedAccessories) {
      this.errorMessage = 'ንጥል ወይም አክሲዮሰሶሮች አልተገኙም።';
      return;
    }
    if (this.issuedItem.issuedAccessories.length > accessoryIndex) {
      this.issuedItem.issuedAccessories.splice(accessoryIndex, 1);
      if (this.issuedItem.issuedAccessories.length === 0) {
        this.issuedItem.hasAccessories = false;
      }
      console.log(`Removed accessory. Total accessories: ${this.issuedItem.issuedAccessories.length}`);
    }
  }

  toggleAccessoriesSection(): void {
    if (!this.issuedItem) {
      this.errorMessage = 'ንጥል ገና አልተጀመረም።';
      return;
    }
    this.issuedItem.issuedAccessories = this.issuedItem.issuedAccessories || [];
    if (!this.issuedItem.hasAccessories) {
      this.issuedItem.issuedAccessories = [];
    } else if (this.issuedItem.issuedAccessories.length === 0) {
      this.addNewAccessory();
    }
  }

  onAccessorySelected(accessoryIndex: number): void {
    if (!this.issuedItem || !this.issuedItem.issuedAccessories) return;
    const selected = this.issuedItem.issuedAccessories[accessoryIndex];
    if (selected?.name) {
      selected.quantity = 1;
      this.validateAccessoryQuantities();
    }
  }

  isAccessoryAlreadySelected(name: string, currentIndex: number): boolean {
    return this.issuedItem?.issuedAccessories?.some((acc: IssuedAccessory, i: number) => acc.name === name && i !== currentIndex) || false;
  }

  getMaxQuantityForAccessory(name: string): number {
    if (!name) return 0;
    const receivedTotal = this.receivedRecords
      .flatMap((r: MasterCardItemReceived) => r.receivedAccessories || [])
      .filter((a: ReceivedAccessory) => a.name === name)
      .reduce((sum: number, a: ReceivedAccessory) => sum + a.quantity, 0);
    const issuedTotal = this.issuedRecords
      .flatMap((i: MasterCardItemIssued) => i.issuedAccessories || [])
      .filter((a: IssuedAccessory) => a.name === name)
      .reduce((sum: number, a: IssuedAccessory) => sum + a.quantity, 0);
    return Math.max(0, receivedTotal - issuedTotal);
  }

  validateAccessoryQuantities(): void {
    if (!this.issuedItem || !this.issuedItem.issuedAccessories) return;
    this.issuedItem.issuedAccessories.forEach((acc: IssuedAccessory) => {
      const max = this.getMaxQuantityForAccessory(acc.name);
      if (acc.quantity > max) acc.quantity = max;
      if (acc.quantity < 1 && acc.name) acc.quantity = 1;
    });
  }

  updateTotalPrice(): void {
    if (!this.issuedItem) {
      this.errorMessage = 'ንጥል ገና አልተጀመረም።';
      return;
    }
    this.issuedItem.totalPrice = Number((this.issuedItem.issued * this.issuedItem.unitPrice).toFixed(2));
  }

  onSubmit(): void {
    if (this.isSubmitting || !this.issuedItem) {
      this.errorMessage = this.issuedItem ? 'ቀድሞ በመዝገብ ላይ ነው።' : 'ንጥል ገና አልተጀመረም።';
      this.isSubmitting = false;
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = null;
    this.warningMessage = null;

    if (!(this.issuedItem.date instanceof Date) || isNaN(this.issuedItem.date.getTime())) {
      this.errorMessage = 'የወጣበት ቀን ትክክል አይደለም።';
      this.isSubmitting = false;
      return;
    }

    if (!this.validateItem(this.issuedItem)) {
      this.isSubmitting = false;
      return;
    }

    if (this.currentStock === null) {
      this.errorMessage = 'የክምችት መረጃ መጫን አልተሳካም። እባክዎን እንደገና ይሞክሩ።';
      this.isSubmitting = false;
      return;
    }

    if (this.issuedItem.issued > this.currentStock) {
      this.errorMessage = `ንጥሎችን መውጣት አይችሉም፡ በክምችት ውስጥ ${this.currentStock} ብዻ ነው ያለው።`;
      this.isSubmitting = false;
      return;
    }

    const payload: MasterCardItemIssued = {
      id: this.issuedItem.id,
      masterCardItemId: this.itemId || 0,
      date: this.issuedItem.date,
      voucherNo: this.issuedItem.voucherNo,
      issued: this.issuedItem.issued,
      organization: this.issuedItem.organization,
      postedBy: this.issuedItem.postedBy,
      location: this.issuedItem.location,
      inStock: this.currentStock - this.issuedItem.issued,
      unitPrice: this.issuedItem.unitPrice,
      totalPrice: Number((this.issuedItem.issued * this.issuedItem.unitPrice).toFixed(2)),
      currencyCode: this.issuedItem.currencyCode,
      hasAccessories: this.issuedItem.hasAccessories,
      issuedAccessories: this.issuedItem.hasAccessories && this.issuedItem.issuedAccessories
        ? this.issuedItem.issuedAccessories.filter((a: IssuedAccessory) => a.name && a.quantity > 0)
        : []
    };

    console.log('Submitting item:', payload);

    this.masterCardService.addMasterCardItemIssued(this.itemId!, payload).pipe(
      catchError((err: any) => {
        console.error(`Error submitting item with VoucherNo ${payload.voucherNo}:`, err);
        this.errorMessage = `ስህተት ለንጥል ${payload.voucherNo}: ${err.error?.error || 'Unknown error'}`;
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe({
      next: (response: MasterCardItemIssued | null) => {
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

  private validateItem(item: MasterCardItemIssued): boolean {
    if (this.itemId === null || this.itemId === 0) {
      this.errorMessage = 'እባክዎን ትክክለኛውን ንጥል መለያ ይግለጹ።';
      return false;
    }
    if (
      !item.voucherNo?.trim() ||
      item.issued <= 0 ||
      !item.organization?.trim() ||
      !item.location?.trim() ||
      item.unitPrice < 0
    ) {
      this.errorMessage = 'እባክዎን ሁሉንም መረጃዎች በትክክል ይሙሉ።';
      return false;
    }

    if (item.hasAccessories && item.issuedAccessories && item.issuedAccessories.length > 0) {
      const validAccs = item.issuedAccessories.filter((a: IssuedAccessory) => a.name?.trim() && a.quantity > 0);
      if (validAccs.length === 0) {
        this.errorMessage = 'አክሲዮሰሶር መምረጥ ከፈለግተው፣ የትክክለኛ ስም እና ብዛት ያስገቡ።';
        return false;
      }
      for (const acc of validAccs) {
        const max = this.getMaxQuantityForAccessory(acc.name);
        if (acc.quantity > max) {
          this.errorMessage = `ብዛት ለ '${acc.name}' ከ ${max} በላይ ሊሆን አይችልም።`;
          return false;
        }
      }
      item.issuedAccessories = validAccs; // Update accessories to only include valid ones
    } else if (item.hasAccessories && (!item.issuedAccessories || item.issuedAccessories.length === 0)) {
      this.errorMessage = 'አክሲዮሰሶሮች መኖር አለባቸው የተመረጡ ከሆነ፣ የትክክለኛ ስም እና ብዛት ያስገቡ።';
      return false;
    } else {
      item.issuedAccessories = [];
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