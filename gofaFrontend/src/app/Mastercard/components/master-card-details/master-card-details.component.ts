import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MasterCardService, Organization, Location } from '../../../services/mastercard.service';
import { MasterCardItem, MasterCardItemReceived, MasterCardItemIssued, ReceivedAccessory, IssuedAccessory } from '../../models/mastercard.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-master-card-details',
  templateUrl: './master-card-details.component.html',
  styleUrls: ['./master-card-details.component.css']
})
export class MasterCardDetailsComponent implements OnInit {
  @ViewChild('content', { static: false }) content!: ElementRef;
  masterCardItem: MasterCardItem | null = null;
  filteredReceivedRecords: MasterCardItemReceived[] = [];
  filteredIssuedRecords: MasterCardItemIssued[] = [];
  searchVoucherNoReceived: string = '';
  searchVoucherNoIssued: string = '';
  selectedAccessoryQuantityReceived: number | null = null;
  selectedAccessoryQuantityIssued: number | null = null;
  accessoryQuantitiesReceived: number[] = [];
  accessoryQuantitiesIssued: number[] = [];
  selectedAccessoryFilter: string | null = null;
  accessoryFilters: string[] = [];
  organizations: Organization[] = [];
  locations: Location[] = [];
  showOrganizationModal = false;
  showLocationModal = false;
  newOrganizationName = '';
  newLocationName = '';
  organizationModalError: string | null = null;
  locationModalError: string | null = null;
  isExporting: boolean = false;
  isEditingMainDetails: boolean = false;
  private originalMasterCardItem: MasterCardItem | null = null;
  currentUserFullName: string | null = null;

  // --- MODAL STATE ---
  showEditReceivedModal = false;
  showEditIssuedModal = false;
  editingReceivedRecord: MasterCardItemReceived | null = null;
  editingIssuedRecord: MasterCardItemIssued | null = null;
  editReceivedError: string | null = null;
  editIssuedError: string | null = null;
  isSavingEdit = false;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private masterCardService: MasterCardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserFullName = `${user.firstName} ${user.lastName || ''}`.trim();
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMasterCardItem(+id);
      this.loadOrganizations();
      this.loadLocations();
    }
  }

  loadMasterCardItem(id: number): void {
    this.masterCardService.getMasterCardItem(id).subscribe({
      next: (item: MasterCardItem) => {
        this.masterCardItem = { ...item, currencyCode: item.currencyCode || 'ETB' };
        this.filteredReceivedRecords = [...(item.receivedRecords || [])];
        this.filteredIssuedRecords = [...(item.issuedRecords || [])];
        this.updateAccessoryQuantities();
        this.updateAccessoryFilters();
        this.updateCurrentQuantity();
        this.searchReceivedRecords();
        this.searchIssuedRecords();
      },
      error: (error) => {
        console.error('Error fetching MasterCard item:', error);
      }
    });
  }

  updateCurrentQuantity(): void {
    if (!this.masterCardItem) return;
    const receivedTotal = (this.masterCardItem.receivedRecords || []).reduce((sum, r) => sum + (r.received || 0), 0);
    const issuedTotal = (this.masterCardItem.issuedRecords || []).reduce((sum, r) => sum + (r.issued || 0), 0);
    this.masterCardItem.quantity = receivedTotal - issuedTotal;
  }

  loadOrganizations(): void {
    this.masterCardService.getOrganizations().subscribe({
      next: (orgs: Organization[]) => {
        this.organizations = orgs;
      },
      error: (err: any) => {
        console.error('Error loading organizations:', err);
        alert('Failed to load organizations.');
      }
    });
  }

  loadLocations(): void {
    this.masterCardService.getLocations().subscribe({
      next: (locs: Location[]) => {
        this.locations = locs;
      },
      error: (err: any) => {
        console.error('Error loading locations:', err);
        alert('Failed to load locations.');
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
        this.closeOrganizationModal();
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
        this.closeLocationModal();
      },
      error: (err: any) => {
        console.error('Error creating location:', err);
        this.locationModalError = err.error?.error || 'ቦታ መፍጠር አልተሳካም።';
      }
    });
  }

  updateAccessoryQuantities(): void {
    const receivedQuantities = new Set<number>();
    const issuedQuantities = new Set<number>();
    (this.masterCardItem?.receivedRecords || []).forEach((r: MasterCardItemReceived) => {
      (r.receivedAccessories || []).forEach((a: ReceivedAccessory) => {
        if (a.quantity) receivedQuantities.add(a.quantity);
      });
    });
    (this.masterCardItem?.issuedRecords || []).forEach((r: MasterCardItemIssued) => {
      (r.issuedAccessories || []).forEach((a: IssuedAccessory) => {
        if (a.quantity) issuedQuantities.add(a.quantity);
      });
    });
    this.accessoryQuantitiesReceived = Array.from(receivedQuantities).sort((a, b) => a - b);
    this.accessoryQuantitiesIssued = Array.from(issuedQuantities).sort((a, b) => a - b);
  }

  updateAccessoryFilters(): void {
    const filters = new Set<string>();
    (this.masterCardItem?.receivedRecords || []).forEach((r: MasterCardItemReceived) => {
      (r.receivedAccessories || []).forEach((a: ReceivedAccessory) => {
        if (a.name && a.quantity) filters.add(`${a.name}: ${a.quantity}`);
      });
    });
    (this.masterCardItem?.issuedRecords || []).forEach((r: MasterCardItemIssued) => {
      (r.issuedAccessories || []).forEach((a: IssuedAccessory) => {
        if (a.name && a.quantity) filters.add(`${a.name}: ${a.quantity}`);
      });
    });
    this.accessoryFilters = Array.from(filters).sort();
  }

  matchesAccessoryFilter(): boolean {
    if (!this.masterCardItem || this.selectedAccessoryFilter === null) return true;
    const [name, qtyStr] = this.selectedAccessoryFilter.split(': ');
    const quantity = parseInt(qtyStr, 10);
    let matches = false;
    (this.masterCardItem.receivedRecords || []).forEach((r: MasterCardItemReceived) => {
      if ((r.receivedAccessories || []).some((a: ReceivedAccessory) => a.name === name && a.quantity === quantity)) {
        matches = true;
      }
    });
    (this.masterCardItem.issuedRecords || []).forEach((r: MasterCardItemIssued) => {
      if ((r.issuedAccessories || []).some((a: IssuedAccessory) => a.name === name && a.quantity === quantity)) {
        matches = true;
      }
    });
    return matches;
  }

  formatDate(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return 'N/A / የለም';
    let dateObj: Date;
    try {
      dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(dateObj.getTime())) return 'Invalid Date / ትክክል ያልሆነ ቀን';
      const gregorian = dateObj.toLocaleDateString('en-GB');
      const ethiopian = this.toEthiopianDate(dateObj);
      return `${ethiopian} / ${gregorian}`;
    } catch {
      return 'Invalid Date / ትክክል ያልሆነ ቀን';
    }
  }

  private toEthiopianDate(date: Date): string {
    const REF = new Date(2024, 8, 11); // Reference date
    const REF_ETH = 2017; // Ethiopian year for reference date
    let diff = Math.floor((date.getTime() - REF.getTime()) / (1000 * 60 * 60 * 24));
    let year = REF_ETH;
    while (diff >= (this.isLeapYearEth(year) ? 366 : 365)) { diff -= this.isLeapYearEth(year++) ? 366 : 365; }
    while (diff < 0) { year--; diff += this.isLeapYearEth(year) ? 366 : 365; }
    const month = Math.floor(diff / 30);
    const day = (diff % 30) + 1;
    return `${day} ${this.ethMonthNames[month] || 'ጥር'} ${year}`;
  }

  private isLeapYearEth(year: number): boolean {
    return year % 4 === 0;
  }

  searchReceivedRecords(): void {
    let filtered = this.masterCardItem?.receivedRecords || [];
    if (this.searchVoucherNoReceived.trim()) {
      const term = this.searchVoucherNoReceived.trim().toLowerCase();
      filtered = filtered.filter((r: MasterCardItemReceived) => r.voucherNo?.toLowerCase().includes(term));
    }
    if (this.selectedAccessoryQuantityReceived !== null) {
      filtered = filtered.filter((r: MasterCardItemReceived) =>
        (r.receivedAccessories || []).some((acc: ReceivedAccessory) => acc.quantity === this.selectedAccessoryQuantityReceived)
      );
    }
    this.filteredReceivedRecords = filtered;
  }

  searchIssuedRecords(): void {
    let filtered = this.masterCardItem?.issuedRecords || [];
    if (this.searchVoucherNoIssued.trim()) {
      const term = this.searchVoucherNoIssued.trim().toLowerCase();
      filtered = filtered.filter((r: MasterCardItemIssued) => r.voucherNo?.toLowerCase().includes(term));
    }
    if (this.selectedAccessoryQuantityIssued !== null) {
      filtered = filtered.filter((r: MasterCardItemIssued) =>
        (r.issuedAccessories || []).some((acc: IssuedAccessory) => acc.quantity === this.selectedAccessoryQuantityIssued)
      );
    }
    this.filteredIssuedRecords = filtered;
  }

  clearSearchReceived(): void {
    this.searchVoucherNoReceived = '';
    this.selectedAccessoryQuantityReceived = null;
    this.searchReceivedRecords();
  }

  clearSearchIssued(): void {
    this.searchVoucherNoIssued = '';
    this.selectedAccessoryQuantityIssued = null;
    this.searchIssuedRecords();
  }

  goBack(): void {
    this.router.navigate(['/MasterCard/mastercard-list']);
  }

  editMainDetails(): void {
    this.isEditingMainDetails = true;
    if (this.masterCardItem) {
      this.originalMasterCardItem = JSON.parse(JSON.stringify(this.masterCardItem));
    }
  }

  saveMainDetails(): void {
    if (this.masterCardItem) {
      this.masterCardService.updateMasterCardItem(this.masterCardItem.id, this.masterCardItem).subscribe({
        next: (updated) => {
          this.masterCardItem = updated;
          this.isEditingMainDetails = false;
        },
        error: (e) => {
          console.error('Failed to update main details:', e);
          alert('Update failed.');
        }
      });
    }
  }

  cancelEditMainDetails(): void {
    if (this.originalMasterCardItem) {
      this.masterCardItem = JSON.parse(JSON.stringify(this.originalMasterCardItem));
    }
    this.isEditingMainDetails = false;
  }

  displayAccessories(accessories: IssuedAccessory[] | ReceivedAccessory[] | undefined): string {
    return !accessories || accessories.length === 0
      ? 'የለም (None)'
      : accessories.map((a: IssuedAccessory | ReceivedAccessory) => `${a.name} (${a.quantity})`).join('<br /> ');
  }

  openEditReceivedModal(record: MasterCardItemReceived): void {
    if (this.isSavingEdit) return;
    this.editingReceivedRecord = JSON.parse(JSON.stringify(record));
    if (this.editingReceivedRecord) {
      if (!this.editingReceivedRecord.receivedAccessories) {
        this.editingReceivedRecord.receivedAccessories = [];
      }
      if (this.editingReceivedRecord.transactionDate) {
        this.editingReceivedRecord.transactionDate = new Date(this.editingReceivedRecord.transactionDate).toISOString().substring(0, 10);
      } else if (this.editingReceivedRecord.date) {
        this.editingReceivedRecord.transactionDate = new Date(this.editingReceivedRecord.date).toISOString().substring(0, 10);
      }
    }
    this.showEditReceivedModal = true;
    this.editReceivedError = null;
  }

  closeEditReceivedModal(): void {
    if (this.isSavingEdit) return;
    this.showEditReceivedModal = false;
    this.editingReceivedRecord = null;
    this.editReceivedError = null;
  }

  updateEditedReceivedTotalPrice(): void {
    if (this.editingReceivedRecord) {
      const quantity = this.editingReceivedRecord.received || 0;
      const price = this.editingReceivedRecord.unitPrice || 0;
      this.editingReceivedRecord.totalPrice = Number((quantity * price).toFixed(2));
    }
  }

  toggleEditReceivedAccessories(): void {
    if (!this.editingReceivedRecord) return;
    if (this.editingReceivedRecord.hasAccessories && (!this.editingReceivedRecord.receivedAccessories || this.editingReceivedRecord.receivedAccessories.length === 0)) {
      this.addEditReceivedAccessory();
    } else if (!this.editingReceivedRecord.hasAccessories) {
      this.editingReceivedRecord.receivedAccessories = [];
    }
  }

  addEditReceivedAccessory(): void {
    if (!this.editingReceivedRecord) return;
    if (!this.editingReceivedRecord.receivedAccessories) {
      this.editingReceivedRecord.receivedAccessories = [];
    }
    const MAX_ACCESSORIES = 10;
    if (this.editingReceivedRecord.receivedAccessories.length >= MAX_ACCESSORIES) {
      this.editReceivedError = `Maximum accessories limit (${MAX_ACCESSORIES}) reached.`;
      console.warn(`Maximum accessories limit (${MAX_ACCESSORIES}) reached for received record ID:`, this.editingReceivedRecord.id);
    } else {
      this.editingReceivedRecord.receivedAccessories.push({
        id: 0,
        name: '',
        quantity: 1,
        masterCardItemReceivedId: this.editingReceivedRecord.id
      });
      console.log(`Accessory added. Total accessories: ${this.editingReceivedRecord.receivedAccessories.length}`);
      if (this.editReceivedError?.includes('Maximum accessories limit')) {
        this.editReceivedError = null;
      }
    }
  }

  removeEditReceivedAccessory(index: number): void {
    if (!this.editingReceivedRecord || !this.editingReceivedRecord.receivedAccessories) return;
    this.editingReceivedRecord.receivedAccessories.splice(index, 1);
    if (this.editingReceivedRecord.receivedAccessories.length === 0) {
      this.editingReceivedRecord.hasAccessories = false;
    }
  }

  saveEditedReceivedRecord(): void {
    if (this.isSavingEdit || !this.editingReceivedRecord) return;
    if (!this.editingReceivedRecord.voucherNo?.trim()) {
      this.editReceivedError = 'Voucher Number is required.';
      return;
    }
    if (this.editingReceivedRecord.received <= 0) {
      this.editReceivedError = 'Received quantity must be greater than 0.';
      return;
    }
    if (!this.editingReceivedRecord.organization?.trim()) {
      this.editReceivedError = 'Organization is required.';
      return;
    }
    if (!this.editingReceivedRecord.location?.trim()) {
      this.editReceivedError = 'Location is required.';
      return;
    }
    if (this.editingReceivedRecord.unitPrice < 0) {
      this.editReceivedError = 'Unit Price cannot be negative.';
      return;
    }
    if (this.editingReceivedRecord.hasAccessories && this.editingReceivedRecord.receivedAccessories?.length === 0) {
      this.editReceivedError = 'Accessories are marked as present, but none are provided.';
      return;
    }
    if (this.editingReceivedRecord.hasAccessories && this.editingReceivedRecord.receivedAccessories) {
      const validAccessories = this.editingReceivedRecord.receivedAccessories.filter((a: ReceivedAccessory) => a.name?.trim() && a.quantity > 0);
      if (validAccessories.length === 0) {
        this.editReceivedError = 'Accessories must have valid names and positive quantities.';
        return;
      }
      this.editingReceivedRecord.receivedAccessories = validAccessories;
    }
    this.isSavingEdit = true;
    this.editReceivedError = null;
    const payload: MasterCardItemReceived = {
      ...this.editingReceivedRecord,
      totalPrice: Number((this.editingReceivedRecord.received * this.editingReceivedRecord.unitPrice).toFixed(2))
    };
    this.masterCardService.updateReceivedRecord(payload.id, payload).subscribe({
      next: (updatedRecord: MasterCardItemReceived) => {
        console.log('Received record updated successfully:', updatedRecord);
        if (this.masterCardItem) {
          const masterIndex = this.masterCardItem.receivedRecords.findIndex(r => r.id === updatedRecord.id);
          if (masterIndex !== -1) {
            this.masterCardItem.receivedRecords[masterIndex] = updatedRecord;
          }
          this.searchReceivedRecords();
          this.updateCurrentQuantity();
          this.updateAccessoryQuantities();
          this.updateAccessoryFilters();
        }
        this.isSavingEdit = false;
        this.closeEditReceivedModal();
      },
      error: (error) => {
        console.error('Error updating received record:', error);
        this.editReceivedError = error.error?.message || 'Failed to update received record.';
        this.isSavingEdit = false;
      }
    });
  }

  openEditIssuedModal(record: MasterCardItemIssued): void {
    if (this.isSavingEdit) return;
    this.editingIssuedRecord = JSON.parse(JSON.stringify(record));
    if (this.editingIssuedRecord) {
      if (!this.editingIssuedRecord.issuedAccessories) {
        this.editingIssuedRecord.issuedAccessories = [];
      }
      if (this.editingIssuedRecord.transactionDate) {
        this.editingIssuedRecord.transactionDate = new Date(this.editingIssuedRecord.transactionDate).toISOString().substring(0, 10);
      } else if (this.editingIssuedRecord.date) {
        this.editingIssuedRecord.transactionDate = new Date(this.editingIssuedRecord.date).toISOString().substring(0, 10);
      }
    }
    this.showEditIssuedModal = true;
    this.editIssuedError = null;
  }

  closeEditIssuedModal(): void {
    if (this.isSavingEdit) return;
    this.showEditIssuedModal = false;
    this.editingIssuedRecord = null;
    this.editIssuedError = null;
  }

  updateEditedIssuedTotalPrice(): void {
    if (this.editingIssuedRecord) {
      const quantity = this.editingIssuedRecord.issued || 0;
      const price = this.editingIssuedRecord.unitPrice || 0;
      this.editingIssuedRecord.totalPrice = Number((quantity * price).toFixed(2));
    }
  }

  toggleEditIssuedAccessories(): void {
    if (!this.editingIssuedRecord) return;
    if (this.editingIssuedRecord.hasAccessories && (!this.editingIssuedRecord.issuedAccessories || this.editingIssuedRecord.issuedAccessories.length === 0)) {
      this.addEditIssuedAccessory();
    } else if (!this.editingIssuedRecord.hasAccessories) {
      this.editingIssuedRecord.issuedAccessories = [];
    }
  }

  addEditIssuedAccessory(): void {
    if (!this.editingIssuedRecord) return;
    if (!this.editingIssuedRecord.issuedAccessories) {
      this.editingIssuedRecord.issuedAccessories = [];
    }
    const MAX_ACCESSORIES = 10;
    if (this.editingIssuedRecord.issuedAccessories.length >= MAX_ACCESSORIES) {
      this.editIssuedError = `Maximum accessories limit (${MAX_ACCESSORIES}) reached.`;
      console.warn(`Maximum accessories limit (${MAX_ACCESSORIES}) reached for issued record ID:`, this.editingIssuedRecord.id);
    } else {
      this.editingIssuedRecord.issuedAccessories.push({
        id: 0,
        name: '',
        quantity: 1
      });
      console.log(`Accessory added. Total accessories: ${this.editingIssuedRecord.issuedAccessories.length}`);
      if (this.editIssuedError?.includes('Maximum accessories limit')) {
        this.editIssuedError = null;
      }
    }
  }

  removeEditIssuedAccessory(index: number): void {
    if (!this.editingIssuedRecord || !this.editingIssuedRecord.issuedAccessories) return;
    this.editingIssuedRecord.issuedAccessories.splice(index, 1);
    if (this.editingIssuedRecord.issuedAccessories.length === 0) {
      this.editingIssuedRecord.hasAccessories = false;
    }
  }

  getMaxAvailableAccessoryQuantity(accessoryName: string, editingRecordId: number): number {
    if (!this.masterCardItem || !accessoryName) {
      return 0;
    }
    const totalReceived = (this.masterCardItem.receivedRecords || [])
      .flatMap((record: MasterCardItemReceived) => record.receivedAccessories || [])
      .filter((acc: ReceivedAccessory) => acc.name === accessoryName)
      .reduce((sum: number, acc: ReceivedAccessory) => sum + acc.quantity, 0);
    const totalIssued = (this.masterCardItem.issuedRecords || [])
      .filter((record: MasterCardItemIssued) => record.id !== editingRecordId)
      .flatMap((record: MasterCardItemIssued) => record.issuedAccessories || [])
      .filter((acc: IssuedAccessory) => acc.name === accessoryName)
      .reduce((sum: number, acc: IssuedAccessory) => sum + acc.quantity, 0);
    const available = totalReceived - totalIssued;
    return Math.max(0, available);
  }

  saveEditedIssuedRecord(): void {
    if (this.isSavingEdit || !this.editingIssuedRecord) return;
    this.editIssuedError = null;
    if (!this.editingIssuedRecord.voucherNo?.trim()) {
      this.editIssuedError = 'Voucher Number is required.';
      return;
    }
    if (this.editingIssuedRecord.issued <= 0) {
      this.editIssuedError = 'Issued quantity must be greater than 0.';
      return;
    }
    if (!this.editingIssuedRecord.organization?.trim()) {
      this.editIssuedError = 'Organization is required.';
      return;
    }
    if (!this.editingIssuedRecord.location?.trim()) {
      this.editIssuedError = 'Location is required.';
      return;
    }
    if (this.editingIssuedRecord.unitPrice < 0) {
      this.editIssuedError = 'Unit Price cannot be negative.';
      return;
    }
    if (this.editingIssuedRecord.hasAccessories && this.editingIssuedRecord.issuedAccessories?.length === 0) {
      this.editIssuedError = 'Accessories are marked as present, but none are provided.';
      return;
    }
    if (this.editingIssuedRecord.hasAccessories && this.editingIssuedRecord.issuedAccessories) {
      const validAccessories = this.editingIssuedRecord.issuedAccessories.filter((a: IssuedAccessory) => a.name?.trim() && a.quantity > 0);
      if (validAccessories.length === 0) {
        this.editIssuedError = 'Accessories must have valid names and positive quantities.';
        return;
      }
      for (const accessory of validAccessories) {
        const maxAvailable = this.getMaxAvailableAccessoryQuantity(accessory.name, this.editingIssuedRecord.id);
        if (accessory.quantity > maxAvailable) {
          this.editIssuedError = `Accessory '${accessory.name}' quantity (${accessory.quantity}) exceeds the available stock (${maxAvailable}).`;
          return;
        }
      }
      this.editingIssuedRecord.issuedAccessories = validAccessories;
    }
    this.isSavingEdit = true;
    const payload: MasterCardItemIssued = {
      ...this.editingIssuedRecord,
      totalPrice: Number((this.editingIssuedRecord.issued * this.editingIssuedRecord.unitPrice).toFixed(2))
    };
    this.masterCardService.updateIssuedRecord(payload.id, payload).subscribe({
      next: (updatedRecord: MasterCardItemIssued) => {
        console.log('Issued record updated successfully:', updatedRecord);
        if (this.masterCardItem) {
          const masterIndex = this.masterCardItem.issuedRecords.findIndex(r => r.id === updatedRecord.id);
          if (masterIndex !== -1) {
            this.masterCardItem.issuedRecords[masterIndex] = updatedRecord;
          }
          this.searchIssuedRecords();
          this.updateCurrentQuantity();
          this.updateAccessoryQuantities();
          this.updateAccessoryFilters();
        }
        this.isSavingEdit = false;
        this.closeEditIssuedModal();
      },
      error: (error) => {
        console.error('Error updating issued record:', error);
        this.editIssuedError = error.error?.message || 'Failed to update issued record. Please try again.';
        this.isSavingEdit = false;
      }
    });
  }

  exportToPDF(): void {
    if (!this.masterCardItem || this.isExporting) return;
    this.isExporting = true;
    setTimeout(() => {
      html2canvas(this.content.nativeElement, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginTop = 20;
        const marginBottom = 20;
        const effectivePageHeight = pageHeight - marginTop - marginBottom;
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        let page = 1;
        const addHeaderFooter = () => {
          pdf.setFontSize(10);
          pdf.text(`Master Card ID: ${this.masterCardItem!.id}`, 10, 10);
          pdf.text(`Page ${page}`, pageWidth - 20, pageHeight - 10);
        };
        addHeaderFooter();
        pdf.addImage(imgData, 'PNG', 0, marginTop, imgWidth, imgHeight);
        heightLeft -= effectivePageHeight;
        position = marginTop - effectivePageHeight;
        while (heightLeft > 0) {
          pdf.addPage();
          page++;
          addHeaderFooter();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= effectivePageHeight;
          position -= effectivePageHeight;
        }
        pdf.save(`MasterCard_${this.masterCardItem!.id}_${new Date().toISOString().split('T')[0]}.pdf`);
        this.isExporting = false;
      }).catch(err => {
        console.error('PDF error:', err);
        this.isExporting = false;
      });
    }, 100);
  }
}