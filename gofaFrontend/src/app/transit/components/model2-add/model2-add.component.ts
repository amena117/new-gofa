import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Model2Service } from '../../services/model2.service';
import { Router } from '@angular/router';
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
  DO: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  preparedBy: string;
  pRank: string;
  pTitle: string;
  checkedBy: string;
  cRank: string;
  cTitle: string;
  approvedBy: string;
  aRank: string;
  aTitle: string;
  issuedTurnBy: string;
  iRank: string;
  iTitle: string;
  issBy: string;
  isRank: string;
  isTitle: string;
  receivedBy: string;
  rRank: string;
  rTitle: string;
  hasAccessories: boolean;
  accessories: Accessory[];
  hasExtraItems: boolean;
  extraItems: ExtraItem[];
  vat: number;
  grandTotal: number;
}

@Component({
  selector: 'app-model2-add',
  templateUrl: './model2-add.component.html',
  styleUrls: ['./model2-add.component.css']
})
export class Model2AddComponent implements OnInit {
  receiveForm: FormGroup;
  isSubmitting = false;
  submissionStatus: string = '';
  storeTypes: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];

  constructor(
    private fb: FormBuilder,
    private model2Service: Model2Service,
    private router: Router,
    private authService: AuthService
  ) {
    const currentEthiopianDate = this.getCurrentEthiopianDate();

    this.receiveForm = this.fb.group({
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
      pRank: [''],
      pTitle: ['', Validators.required],
      checkedBy: ['', Validators.required],
      cRank: [''],
      cTitle: ['', Validators.required],
      approvedBy: ['', Validators.required],
      aRank: [''],
      aTitle: ['', Validators.required],
      issuedTurnBy: ['', Validators.required],
      iRank: [''],
      iTitle: ['', Validators.required],
      issBy: ['', Validators.required],
      isRank: [''],
      isTitle: ['', Validators.required],
      receivedBy: ['', Validators.required],
      rRank: [''],
      rTitle: ['', Validators.required],
      itemDetails: this.fb.array([this.createItem()])
    });

    this.autoFillRegisteredBy();
  }

  ngOnInit(): void { }

  get itemDetails(): FormArray {
    return this.receiveForm.get('itemDetails') as FormArray;
  }

  createItem(): FormGroup {
    const group = this.fb.group({
      stockNumber: ['', Validators.required],
      description: ['', Validators.required],
      unitOfMeasurment: ['', Validators.required],
      onHand: [0, [Validators.required, Validators.min(0)]],
      request: [0, [Validators.required, Validators.min(0)]],
      issued: [0, [Validators.required, Validators.min(0)]],
      DO: [0, [Validators.required, Validators.min(0)]],
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

    this.receiveForm.patchValue({
      registeredBy: `${fullName} (${title})`
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

    this.receiveForm.get('transactionDate')?.enable();
    const formValue = this.receiveForm.getRawValue();

    const payloads: Model2Dto[] = [];

    for (const item of formValue.itemDetails) {
      const payload: Model2Dto = {
        id: 0,
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
        stockNumber: item.stockNumber,
        description: item.description,
        unitOfMeasurment: item.unitOfMeasurment,
        onHand: +item.onHand,
        request: +item.request,
        issued: +item.issued,
        DO: +item.DO,
        unitPrice: +item.unitPrice,
        totalPrice: +item.totalPrice,
        currency: item.currency,
        preparedBy: formValue.preparedBy,
        pRank: formValue.pRank,
        pTitle: formValue.pTitle,
        checkedBy: formValue.checkedBy,
        cRank: formValue.cRank,
        cTitle: formValue.cTitle,
        approvedBy: formValue.approvedBy,
        aRank: formValue.aRank,
        aTitle: formValue.aTitle,
        issuedTurnBy: formValue.issuedTurnBy,
        iRank: formValue.iRank,
        iTitle: formValue.iTitle,
        issBy: formValue.issBy,
        isRank: formValue.isRank,
        isTitle: formValue.isTitle,
        receivedBy: formValue.receivedBy,
        rRank: formValue.rRank,
        rTitle: formValue.rTitle,
        hasAccessories: item.hasAccessories,
        accessories: item.hasAccessories
          ? (item.accessories || []).map((acc: any) => ({
            name: acc.name || '',
            quantity: +acc.quantity || 0
          }))
          : [],
        hasExtraItems: item.hasExtraItems,
        extraItems: item.hasExtraItems
          ? (item.extraItems || []).map((extra: any) => ({
            name: extra.name,
            quantity: +extra.quantity,
            store: extra.store,
            extraStatus: extra.extraStatus,
            extraIssuedByName: extra.extraIssuedByName || ''
          }))
          : [],
        vat: +item.vat,
        grandTotal: +item.grandTotal
      };
      payloads.push(payload);
    }



    this.model2Service.addModel2(payloads).subscribe({
      next: () => {
        this.submissionStatus = '✅ All items submitted successfully!';
        this.resetForm();
        this.router.navigate(['/transit/model2-list']);
      },
      error: (err) => {
        console.error('Submission failed:', err);
        let msg = err.error?.message || err.message || 'Unknown error';
        if (err.error && typeof err.error === 'object' && !Array.isArray(err.error)) {
          msg = Object.keys(err.error)
            .map(k => `${k}: ${err.error[k]}`)
            .join('; ');
        }
        this.submissionStatus = `❌ Failed: ${msg}`;
        this.isSubmitting = false;
      }
    });

    this.receiveForm.get('transactionDate')?.disable();
  }

  private resetForm() {
    this.isSubmitting = false;
    this.receiveForm.reset();
    this.itemDetails.clear();
    this.itemDetails.push(this.createItem());

    const ethiopianDate = this.getCurrentEthiopianDate();
    this.receiveForm.patchValue({
      transactionDate: ethiopianDate,
      status: 'Unserviceable',
      transType: 'Issue',
      currency: 'Birr'
    });
    this.receiveForm.get('transactionDate')?.disable();
    this.autoFillRegisteredBy();
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