import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TransitService } from '../../services/transit.service';
import { AuthService } from '../../../services/auth.service';
import Kenat from 'kenat';
import { Router } from '@angular/router';

interface Accessory {
  name: string;
  quantity: number;
  subAccessories?: SubAccessory[];
}

interface SubAccessory {
  name: string;
  quantity: number;
}

interface ExtraItem {
  name: string;
  quantity: number;
  store: string;
  extraStatus: string;
  extraRecivedByName: string;
}

interface Model1Dto {
  Model1Id?: number;
  supplier: string;
  category: string;
  prno: string;
  date: string;
  invoiceNo: string;
  itemType: string;
  contactNumber: string;
  number: string;
  registeredBy: string;
  serialNumber: string;
  description: string;
  unitOfMeasurment: string;
  ordered: number;
  received: number;
  unitOfPrice: number;
  amount: number;
  currency: string;
  location: string;
  remark: string;
  checkedByName: string;
  cTitle: string;
  recivedByName: string;
  rTitle: string;
  authorizedByName: string;
  aTitle: string;
  model19Ref: string;
  status: string;
  storeType: string;
  hasAccessories: boolean;
  accessories: Accessory[];
  hasExtraItems: boolean;
  extraItems: ExtraItem[];
  vat: number;
  grandTotal: number;
}

@Component({
  selector: 'app-receive-item-form',
  templateUrl: './receive-item-form.component.html',
  styleUrls: ['./receive-item-form.component.css'],
})
export class ReceiveItemFormComponent {
  receiveForm: FormGroup;
  isSubmitting = false;
  submissionStatus: string = '';
  storeTypes: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];

  constructor(
    private fb: FormBuilder,
    private transitService: TransitService,
    private authService: AuthService,
    private router: Router
  ) {
    const ethiopianDate = this.getCurrentEthiopianDate();

    this.receiveForm = this.fb.group({
      // General Info
      supplier: ['', Validators.required],
      category: ['', Validators.required],
      status: ['Waiting For Stores', Validators.required],

      prno: ['', Validators.required],
      date: [''],
      invoiceNo: ['', Validators.required],
      itemType: ['', Validators.required],
      contactNumber: ['', Validators.required],
      number: ['', Validators.required],
      registeredBy: ['', Validators.required],
      currency: ['', Validators.required],
      location: ['', Validators.required],
      model19Ref: ['', Validators.required],
      remark: [''],

      // Approval
      checkedByName: ['', Validators.required],
      cTitle: ['', Validators.required],
      recivedByName: ['', Validators.required],
      rTitle: ['', Validators.required],
      authorizedByName: ['', Validators.required],
      aTitle: ['', Validators.required],

      // Ethiopian Date
      transactionDate: [{ value: ethiopianDate, disabled: true }],

      // Items
      itemDetails: this.fb.array([this.createItem()])
    });

    this.autoFillRegisteredBy();
  }

  get itemDetails(): FormArray {
    return this.receiveForm.get('itemDetails') as FormArray;
  }

  createItem(): FormGroup {
    const group = this.fb.group({
      serialNumber: ['', Validators.required],
      description: ['', Validators.required],
      unitOfMeasurment: ['', Validators.required],
      ordered: [1, [Validators.required, Validators.min(1)]],
      received: [1, [Validators.required, Validators.min(1)]],
      unitOfPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      storeType: ['', Validators.required],
      hasAccessories: [false],
      accessories: this.fb.array([]),
      hasExtraItems: [false],
      extraItems: this.fb.array([]),
      vat: [0, [Validators.required, Validators.min(0)]],
      grandTotal: [0, [Validators.required, Validators.min(0)]]
    });

    // Auto-calculate amount and grandTotal
    group.valueChanges.subscribe(val => {
      const received = +(val?.received || 0);
      const unitPrice = +(val?.unitOfPrice || 0);
      const vat = +(val?.vat || 0);

      const amount = received * unitPrice;
      const grandTotal = amount + vat;

      group.patchValue({
        amount: amount,
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

  getAccessoryControls(itemIndex: number): FormArray {
    return this.itemDetails.at(itemIndex).get('accessories') as FormArray;
  }

  addAccessory(itemIndex: number): void {
    this.getAccessoryControls(itemIndex).push(
      this.fb.group({
        name: [''],
        quantity: [''],
        unitPrice: [''],
        currency: [''],
        hasSubAccessories: [false],
        subAccessories: this.fb.array([])
      })
    );
  }

  removeAccessory(itemIndex: number, accIndex: number): void {
    this.getAccessoryControls(itemIndex).removeAt(accIndex);
  }

  getSubAccessoryControls(itemIndex: number, accIndex: number): FormArray {
    return this.getAccessoryControls(itemIndex).at(accIndex).get('subAccessories') as FormArray;
  }

  addSubAccessory(itemIndex: number, accIndex: number): void {
    this.getSubAccessoryControls(itemIndex, accIndex).push(
      this.fb.group({
        name: [''],
        quantity: [''],
        unitPrice: [''],
        currency: ['']
      })
    );
  }

  removeSubAccessory(itemIndex: number, accIndex: number, subAccIndex: number): void {
    this.getSubAccessoryControls(itemIndex, accIndex).removeAt(subAccIndex);
  }

  getExtraItemControls(itemIndex: number): FormArray {
    return this.itemDetails.at(itemIndex).get('extraItems') as FormArray;
  }

  addExtraItem(itemIndex: number): void {
    this.getExtraItemControls(itemIndex).push(
      this.fb.group({
        name: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        store: ['', Validators.required],
        extraStatus: ['Waiting For Stores', Validators.required]

      })
    );
  }

  removeExtraItem(itemIndex: number, extraIndex: number): void {
    this.getExtraItemControls(itemIndex).removeAt(extraIndex);
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

    this.receiveForm.patchValue({
      registeredBy: fullName + " (" + title + ")",

    });
  }

  onSubmit() {
    if (this.receiveForm.invalid) {
      this.submissionStatus = 'Please fill all required fields.';
      this.markFormGroupTouched(this.receiveForm);
      return;
    }

    this.isSubmitting = true;
    this.submissionStatus = 'Submitting...';

    // Enable transactionDate to read value
    this.receiveForm.get('transactionDate')?.enable();
    const formValue = this.receiveForm.value;

    const payloads: Model1Dto[] = [];

    // Build one payload per item
    for (const item of formValue.itemDetails) {
      const payload: Model1Dto = {
        supplier: formValue.supplier,
        category: formValue.category,
        status: formValue.status,
        prno: formValue.prno,
        date: formValue.transactionDate, // Use Ethiopian date
        invoiceNo: formValue.invoiceNo,
        itemType: formValue.itemType,
        contactNumber: formValue.contactNumber,
        number: formValue.number,
        registeredBy: formValue.registeredBy,
        currency: formValue.currency,
        location: formValue.location,
        remark: formValue.remark,
        checkedByName: formValue.checkedByName,
        cTitle: formValue.cTitle,
        recivedByName: formValue.recivedByName,
        rTitle: formValue.rTitle,
        authorizedByName: formValue.authorizedByName,
        aTitle: formValue.aTitle,
        model19Ref: formValue.model19Ref,

        // Item-specific
        serialNumber: item.serialNumber,
        description: item.description,
        unitOfMeasurment: item.unitOfMeasurment,
        ordered: +item.ordered,
        received: +item.received,
        unitOfPrice: +item.unitOfPrice,
        amount: +item.amount,
        storeType: item.storeType,

        hasAccessories: item.hasAccessories,
        accessories: item.hasAccessories
          ? (item.accessories || []).map((acc: any) => ({
            name: acc.name || '',
            quantity: +acc.quantity || 0,
            unitPrice: acc.unitPrice ? +acc.unitPrice : null,
            currency: acc.currency || null,
            subAccessories: acc.hasSubAccessories && acc.subAccessories
              ? acc.subAccessories.map((subAcc: any) => ({
                  name: subAcc.name || '',
                  quantity: +subAcc.quantity || 0,
                  unitPrice: subAcc.unitPrice ? +subAcc.unitPrice : null,
                  currency: subAcc.currency || null
                }))
              : []
          }))
          : [],

        hasExtraItems: item.hasExtraItems,
        extraItems: item.hasExtraItems
          ? (item.extraItems || []).map((extra: any) => ({
            name: extra.name,
            quantity: +extra.quantity,
            store: extra.store,
            extraStatus: extra.extraStatus,
            extraRecivedByName: '' // Optional: set later
          }))
          : [],
        vat: +item.vat,
        grandTotal: +item.grandTotal
      };
      payloads.push(payload);
    }

    // Submit one by one
    let completed = 0;
    const total = payloads.length;

    payloads.forEach(payload => {
      this.transitService.sendToInspection(payload).subscribe({
        next: (res) => {
          completed++;
          if (completed === total) {
            this.submissionStatus = '✅ All items submitted successfully!';
            this.resetForm();
            this.router.navigate(['/transit/received-items']);
          }
        },
        error: (err) => {
          console.error('Submission failed:', err);
          let msg = err.error?.message || err.message || 'Unknown error';
          if (typeof err.error === 'object') {
            msg = Object.keys(err.error)
              .map(k => `${k}: ${err.error[k]}`)
              .join('; ');
          }
          this.submissionStatus = `❌ Failed: ${msg}`;
          this.isSubmitting = false;
        }
      });
    });
  }

  private resetForm() {
    this.isSubmitting = false;
    this.receiveForm.reset();
    this.itemDetails.clear();
    this.itemDetails.push(this.createItem());

    const ethiopianDate = this.getCurrentEthiopianDate();
    this.receiveForm.patchValue({ transactionDate: ethiopianDate });
    this.receiveForm.get('transactionDate')?.disable();

    this.autoFillRegisteredBy();
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const ctrl = formGroup.get(key);
      if (ctrl instanceof FormGroup || ctrl instanceof FormArray) {
        this.markFormGroupTouched(ctrl);
      } else {
        ctrl?.markAsTouched({ onlySelf: true });
      }
    });
  }
}