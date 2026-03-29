import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Model2Service } from '../../services/model2.service';
import Kenat from 'kenat';
import { AuthService } from '../../../services/auth.service';

interface Accessory {
  name: string;
  quantity: number;
}

interface ExtraItem {
  name: string;
  quantity: number;
  store: string;
  extraStatus: string;
  extraIssuedByName: string;
}

interface Model2Dto {
  id: number;
  Date: string;
  issueVocNo: string;
  voucherNumber: string;
  transType: string;
  requestingUnit: string;
  issuingStore: string;
  model: string;
  registeredBy: string;
  status: string;
  category: string;
  stockNumber: string;
  description: string;
  unitOfMeasurment: string;
  onHand: number;
  request: number;
  issued: number;
  do: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  preparedBy: string;
  pTitle: string;
  checkedBy: string;
  cTitle: string;
  approvedBy: string;
  aTitle: string;
  issuedTurnBy: string;
  iTitle: string;
  issBy: string;
  isTitle: string;
  receivedBy: string;
  rTitle: string;
  hasAccessories: boolean;
  accessories: Accessory[];
  hasExtraItems: boolean;
  extraItems: ExtraItem[];
  vat: number;
  grandTotal: number;
}

@Component({
  selector: 'app-model2-edit',
  templateUrl: './model2-edit.component.html',
  styleUrls: ['./model2-edit.component.css']
})
export class Model2EditComponent implements OnInit {
  editForm: FormGroup;
  isSubmitting = false;
  submissionStatus: string = '';
  storeTypes: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  itemId: string = '';

  constructor(
    private fb: FormBuilder,
    private model2Service: Model2Service,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    const currentEthiopianDate = this.getCurrentEthiopianDate();

    this.editForm = this.fb.group({
      transactionDate: [{ value: currentEthiopianDate, disabled: true }, Validators.required],
      issueVocNo: ['', Validators.required],
      voucherNumber: ['', Validators.required],
      transType: ['', Validators.required],
      requestingUnit: ['', Validators.required],
      issuingStore: ['', Validators.required],
      model: ['', Validators.required],
      registeredBy: ['', Validators.required],
      status: ['', Validators.required],
      category: ['', Validators.required],
      preparedBy: ['', Validators.required],
      pTitle: ['', Validators.required],
      checkedBy: ['', Validators.required],
      cTitle: ['', Validators.required],
      approvedBy: ['', Validators.required],
      aTitle: ['', Validators.required],
      issuedTurnBy: ['', Validators.required],
      iTitle: ['', Validators.required],
      issBy: ['', Validators.required],
      isTitle: ['', Validators.required],
      receivedBy: ['', Validators.required],
      rTitle: ['', Validators.required],
      itemDetails: this.fb.array([this.createItem()])
    });

    this.autoFillRegisteredBy();
  }

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.itemId || this.itemId === 'undefined') {
      console.error('Item ID is missing or invalid!');
      this.submissionStatus = 'Invalid item ID. Redirecting to list...';
      setTimeout(() => {
        this.router.navigate(['/transit/model2-list']);
      }, 1500);
      return;
    }
    this.loadItemData(this.itemId);
  }

  get itemDetails(): FormArray {
    return this.editForm.get('itemDetails') as FormArray;
  }

  createItem(): FormGroup {
    const group = this.fb.group({
      stockNumber: ['', Validators.required],
      description: ['', Validators.required],
      unitOfMeasurment: ['', Validators.required],
      onHand: [0, [Validators.required, Validators.min(0)]],
      request: [0, [Validators.required, Validators.min(0)]],
      issued: [0, [Validators.required, Validators.min(0)]],
      do: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      totalPrice: [0, [Validators.required, Validators.min(0)]],
      currency: ['Birr', Validators.required],
      hasAccessories: [false],
      accessories: this.fb.array([]),
      hasExtraItems: [false],
      extraItems: this.fb.array([]),
      vat: [0, [Validators.required, Validators.min(0)]],
      grandTotal: [0, [Validators.required, Validators.min(0)]]
    });

    // Auto-calculate totalPrice and grandTotal
    group.valueChanges.subscribe(val => {
      const issued = +(val?.issued || 0);
      const unitPrice = +(val?.unitPrice || 0);
      const vat = +(val?.vat || 0);

      const totalPrice = issued * unitPrice;
      const grandTotal = totalPrice + vat;

      group.patchValue({
        totalPrice: totalPrice,
        grandTotal: grandTotal
      }, { emitEvent: false });
    });

    return group;
  }

  addItem(): void {
    this.itemDetails.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.itemDetails.length > 1) {
      this.itemDetails.removeAt(index);
    }
  }

  getAccessories(itemIndex: number): FormArray {
    return this.itemDetails.at(itemIndex).get('accessories') as FormArray;
  }

  addAccessory(itemIndex: number): void {
    this.getAccessories(itemIndex).push(
      this.fb.group({
        name: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]]
      })
    );
  }

  removeAccessory(itemIndex: number, accIndex: number): void {
    this.getAccessories(itemIndex).removeAt(accIndex);
  }

  getExtraItems(itemIndex: number): FormArray {
    return this.itemDetails.at(itemIndex).get('extraItems') as FormArray;
  }

  addExtraItem(itemIndex: number): void {
    this.getExtraItems(itemIndex).push(
      this.fb.group({
        name: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        store: ['', Validators.required],
        extraStatus: ['Waiting For Stores', Validators.required],
        extraIssuedByName: ['']
      })
    );
  }

  removeExtraItem(itemIndex: number, extraIndex: number): void {
    this.getExtraItems(itemIndex).removeAt(extraIndex);
  }

  private getCurrentEthiopianDate(): string {
    try {
      const today = new Kenat();
      const formatted = today.format({ lang: 'amharic' });
      const [month, day, year] = formatted.split(' ');
      return `${month} ${day}, ${year}`;
    } catch (error) {
      console.error('Ethiopian date error:', error);
      return 'አልተተኩስም';
    }
  }

  private autoFillRegisteredBy() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.authService.fetchUserInfo().subscribe(u => {
        if (u) this.fillNameAndTitle(u);
      });
    } else {
      this.fillNameAndTitle(user);
    }
  }

  private fillNameAndTitle(user: any) {
    const fullName = `${user.firstName} ${user.lastName || ''}`.trim();
    const role = user.role;

    const titleMap: Record<string, string> = {
      VHF: 'Store Officer - VHF',
      HF: 'Store Officer - HF',
      SPAREPART: 'Store Officer - Spare Parts',
      ELECTRONICS: 'Store Officer - Electronics',
      TRANSIT: 'Transit Officer',
      SUPPYL_AND_DISTRIBUTION_TEAMLEADER: 'Team Leader',
    };
    const title = titleMap[role] || 'Store Officer';

    this.editForm.patchValue({
      registeredBy: `${fullName} (${title})`
    });
  }

  private loadItemData(itemId: string) {
    this.model2Service.getModel2ItemById(itemId).subscribe({
      next: (item: Model2Dto) => {
        console.log('Loaded item:', item); // Debug log
        this.patchFormValues(item);
      },
      error: (err) => {
        console.error('Error loading item:', err);
        this.submissionStatus = 'Failed to load item data.';
      }
    });
  }

  private patchFormValues(item: Model2Dto) {
    // Patch general fields
    this.editForm.patchValue({
      transactionDate: item.Date || this.getCurrentEthiopianDate(),
      issueVocNo: item.issueVocNo,
      voucherNumber: item.voucherNumber,
      transType: item.transType,
      requestingUnit: item.requestingUnit,
      issuingStore: item.issuingStore,
      model: item.model,
      registeredBy: item.registeredBy,
      status: item.status,
      category: item.category,
      preparedBy: item.preparedBy,
      pTitle: item.pTitle,
      checkedBy: item.checkedBy,
      cTitle: item.cTitle,
      approvedBy: item.approvedBy,
      aTitle: item.aTitle,
      issuedTurnBy: item.issuedTurnBy,
      iTitle: item.iTitle,
      issBy: item.issBy,
      isTitle: item.isTitle,
      receivedBy: item.receivedBy,
      rTitle: item.rTitle
    });

    // Clear and repopulate itemDetails (assuming single item for edit)
    this.itemDetails.clear();
    const itemGroup = this.createItem();
    itemGroup.patchValue({
      stockNumber: item.stockNumber,
      description: item.description,
      unitOfMeasurment: item.unitOfMeasurment,
      onHand: item.onHand,
      request: item.request,
      issued: item.issued,
      do: item.do,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      vat: item.vat,
      grandTotal: item.grandTotal,
      currency: item.currency,
      hasAccessories: item.hasAccessories,
      hasExtraItems: item.hasExtraItems
    });
    this.itemDetails.push(itemGroup);

    // Populate accessories if present
    const accessoriesArray = this.getAccessories(0);
    accessoriesArray.clear();
    if (item.hasAccessories && item.accessories && item.accessories.length > 0) {
      item.accessories.forEach(acc => {
        accessoriesArray.push(this.fb.group({
          name: [acc.name, Validators.required],
          quantity: [acc.quantity, [Validators.required, Validators.min(1)]]
        }));
      });
    }

    // Populate extraItems if present
    const extraItemsArray = this.getExtraItems(0);
    extraItemsArray.clear();
    if (item.hasExtraItems && item.extraItems && item.extraItems.length > 0) {
      item.extraItems.forEach(ex => {
        extraItemsArray.push(this.fb.group({
          name: [ex.name, Validators.required],
          quantity: [ex.quantity, [Validators.required, Validators.min(1)]],
          store: [ex.store, Validators.required],
          extraStatus: [ex.extraStatus, Validators.required],
          extraIssuedByName: [ex.extraIssuedByName || '']
        }));
      });
    }
  }

  onSubmit() {
    if (this.editForm.invalid) {
      this.submissionStatus = 'Please fill all required fields.';
      this.markFormGroupTouched(this.editForm);
      return;
    }

    this.isSubmitting = true;
    this.submissionStatus = 'Updating...';

    this.editForm.get('transactionDate')?.enable();
    const formValue = this.editForm.getRawValue();

    const payload: Model2Dto = {
      id: +this.itemId,
      Date: formValue.transactionDate,
      issueVocNo: formValue.issueVocNo,
      voucherNumber: formValue.voucherNumber,
      transType: formValue.transType,
      requestingUnit: formValue.requestingUnit,
      issuingStore: formValue.issuingStore,
      model: formValue.model,
      registeredBy: formValue.registeredBy,
      status: formValue.status,
      category: formValue.category,
      stockNumber: formValue.itemDetails[0].stockNumber,
      description: formValue.itemDetails[0].description,
      unitOfMeasurment: formValue.itemDetails[0].unitOfMeasurment,
      onHand: +formValue.itemDetails[0].onHand,
      request: +formValue.itemDetails[0].request,
      issued: +formValue.itemDetails[0].issued,
      do: +formValue.itemDetails[0].do,
      unitPrice: +formValue.itemDetails[0].unitPrice,
      totalPrice: +formValue.itemDetails[0].totalPrice,
      currency: formValue.itemDetails[0].currency,
      preparedBy: formValue.preparedBy,
      pTitle: formValue.pTitle,
      checkedBy: formValue.checkedBy,
      cTitle: formValue.cTitle,
      approvedBy: formValue.approvedBy,
      aTitle: formValue.aTitle,
      issuedTurnBy: formValue.issuedTurnBy,
      iTitle: formValue.iTitle,
      issBy: formValue.issBy,
      isTitle: formValue.isTitle,
      receivedBy: formValue.receivedBy,
      rTitle: formValue.rTitle,
      hasAccessories: formValue.itemDetails[0].hasAccessories,
      accessories: formValue.itemDetails[0].hasAccessories
        ? (formValue.itemDetails[0].accessories || []).map((acc: any) => ({
          name: acc.name || '',
          quantity: +acc.quantity || 0
        }))
        : [],
      vat: +formValue.itemDetails[0].vat,
      grandTotal: +formValue.itemDetails[0].grandTotal,
      hasExtraItems: formValue.itemDetails[0].hasExtraItems,
      extraItems: formValue.itemDetails[0].hasExtraItems
        ? (formValue.itemDetails[0].extraItems || []).map((extra: any) => ({
          name: extra.name,
          quantity: +extra.quantity,
          store: extra.store,
          extraStatus: extra.extraStatus,
          extraIssuedByName: extra.extraIssuedByName || ''
        }))
        : []
    };



    this.model2Service.updateModel2Item(this.itemId, payload).subscribe({
      next: () => {
        this.submissionStatus = '✅ Item updated successfully!';
        setTimeout(() => {
          this.router.navigate(['/transit/model2-list']);
        }, 1500);
      },
      error: (err) => {
        console.error('Update failed:', err);
        let msg = err.error?.message || err.message || 'Unknown error';
        if (typeof err.error === 'object' && err.error.errors) {
          msg = Object.keys(err.error.errors)
            .map(k => `${k}: ${err.error.errors[k].join(', ')}`)
            .join('; ');
        }
        this.submissionStatus = `❌ Failed: ${msg}`;
        this.isSubmitting = false;
      }
    });

    this.editForm.get('transactionDate')?.disable();
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched({ onlySelf: true });
      }
    });
  }
}