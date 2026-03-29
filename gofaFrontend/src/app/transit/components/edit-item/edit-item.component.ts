
// // import { Component, Inject } from '@angular/core';
// // import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// // import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// // import { Item } from '../../models/item.model';

// // @Component({
// //   selector: 'app-edit-item',
// //   templateUrl: './edit-item.component.html',
// //   styleUrl: './edit-item.component.css',
// // })
// // export class EditItemComponent {
// //   editForm: FormGroup;

// //   constructor(
// //     private fb: FormBuilder,
// //     public dialogRef: MatDialogRef<EditItemComponent>,
// //     @Inject(MAT_DIALOG_DATA) public data: { item: Item }
// //   ) {
// //     this.editForm = this.fb.group({
// //       Supplier: [data.item.Supplier, Validators.required],
// //       ItemType: [data.item.ItemType, Validators.required],
// //       SerialNumber: [data.item.SerialNumber, Validators.required],
// //       Status: [data.item.Status]
// //     });
// //   }

// //   saveChanges() {
// //     if (this.editForm.valid) {
// //       this.dialogRef.close(this.editForm.value);
// //     }
// //   }
// // }


// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';
// import { TransitService } from '../../services/transit.service';
// import { Item } from '../../models/item.model';

// @Component({
//   selector: 'app-edit-item',
//   templateUrl: './edit-item.component.html',
//   styleUrls: ['./edit-item.component.css']
// })
// export class EditItemComponent implements OnInit {
//   editForm!: FormGroup;
//   itemId!: number;


//   constructor(
//     private fb: FormBuilder,
//     private route: ActivatedRoute,
//     public router: Router,
//     private transitService: TransitService
//   ) {}

//   ngOnInit() {
//     this.itemId = +this.route.snapshot.paramMap.get('id')!;
//     this.initializeForm();
//     this.loadItem();
//   }

//   initializeForm() {
//     this.editForm = this.fb.group({
//       Supplier: ['', Validators.required],
//       Category: ['', Validators.required],
//       PRNO: ['', Validators.required],
//       Date: ['', Validators.required],
//       // Add all other form controls matching your model
//       // ...
//       AuthorizedByName: ['', Validators.required]
//     });
//   }

//   loadItem() {
//     this.transitService.getItemById(this.itemId).subscribe(item => {
//       this.editForm.patchValue(item);
//       // If you need to handle date formatting:
//       if(item.Date) {
//         this.editForm.patchValue({
//           Date: new Date(item.Date).toISOString().substring(0,10)
//         });
//       }
//     });
//   }


//   onSubmit() {
//     if (this.editForm.valid) {
//       this.transitService.updateItem(this.itemId, this.editForm.value)
//         .subscribe(() => {
//           this.router.navigate(['/received-items']);
//         });
//     }
//   }
// }


import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-edit-item',
  templateUrl: './edit-item.component.html',
  styleUrls: ['./edit-item.component.css']
})
export class EditItemComponent implements OnInit {
  editForm!: FormGroup;
  itemId!: string;
  storeTypes: string[] = ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'];
  isFormEditable = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private transitService: TransitService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.itemId = this.route.snapshot.paramMap.get('id')!;
    if (this.itemId) {
      this.loadItemData(this.itemId);
    } else {
      console.error('Item ID is missing!');
    }
  }

  private initializeForm() {
    this.editForm = this.fb.group({
      Supplier: ['', Validators.required],
      Model1Id: ['', Validators.required],
      ItemType: ['', Validators.required],
      SerialNumber: ['', Validators.required],
      Category: ['', Validators.required],
      PRNO: ['', Validators.required],
      Date: ['', Validators.required],
      InvoiceNo: ['', Validators.required],
      ContactNumber: ['', Validators.required],
      Number: ['', Validators.required],
      RegisteredBy: ['', Validators.required],
      Description: ['', Validators.required],
      UnitOfMeasurment: ['', Validators.required],
      Ordered: ['', Validators.required],
      Received: ['', Validators.required],
      UnitOfPrice: ['', Validators.required],
      Amount: [0, [Validators.required, Validators.min(0)]],
      Currency: ['', Validators.required],
      Location: ['', Validators.required],
      Remark: [''],
      CheckedByName: ['', Validators.required],
      CTitle: ['', Validators.required],
      RecivedByName: ['', Validators.required],
      RTitle: ['', Validators.required],
      AuthorizedByName: ['', Validators.required],
      ATitle: ['', Validators.required],
      StoreType: ['', Validators.required],
      Status: ['Waiting For Stores', Validators.required],
      Model19Ref: ['', Validators.required],
      Vat: [0, [Validators.required, Validators.min(0)]],
      GrandTotal: [0, [Validators.required, Validators.min(0)]],
      Accessories: this.fb.array([]),
      ExtraItems: this.fb.array([])
    });

    // Auto-calculate Amount and GrandTotal
    this.editForm.valueChanges.subscribe(val => {
      const received = +(val?.Received || 0);
      const unitPrice = +(val?.UnitOfPrice || 0);
      const vat = +(val?.Vat || 0);

      const amount = received * unitPrice;
      const grandTotal = amount + vat;

      this.editForm.patchValue({
        Amount: amount,
        GrandTotal: grandTotal
      }, { emitEvent: false });
    });
  }

  get accessories(): FormArray {
    return this.editForm.get('Accessories') as FormArray;
  }

  get extraItems(): FormArray {
    return this.editForm.get('ExtraItems') as FormArray;
  }

  addAccessory() {
    this.accessories.push(this.fb.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    }));
  }

  removeAccessory(index: number) {
    this.accessories.removeAt(index);
  }

  addExtraItem() {
    this.extraItems.push(this.fb.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      store: ['', Validators.required],
      extraStatus: ['', Validators.required],
      extraRecivedByName: [''] // No Validators.required
    }));
  }

  removeExtraItem(index: number) {
    this.extraItems.removeAt(index);
  }

  private loadItemData(itemId: string) {
    this.transitService.getItemById(itemId).subscribe({
      next: (item) => {
        this.patchFormValues(item);
        const formattedDate = this.formatDate(item.date);
        this.editForm.patchValue({ Date: formattedDate });
        this.errorMessage = null;
      },
      error: (err) => {
        console.error('Error loading item:', err);
        this.errorMessage = 'Failed to load item data. Please try again.';
      }
    });
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  private patchFormValues(item: Item) {
    this.editForm.patchValue({
      Supplier: item.supplier,
      Model1Id: item.model1Id,
      ItemType: item.itemType,
      SerialNumber: item.serialNumber,
      Status: item.status,
      Category: item.category,
      PRNO: item.prno,
      InvoiceNo: item.invoiceNo,
      ContactNumber: item.contactNumber,
      Number: item.number,
      RegisteredBy: item.registeredBy,
      StoreType: item.storeType,
      Description: item.description,
      UnitOfMeasurment: item.unitOfMeasurment,
      Ordered: item.ordered,
      Received: item.received,
      UnitOfPrice: item.unitOfPrice,
      Amount: item.amount,
      Currency: item.currency,
      Location: item.location,
      Remark: item.remark,
      CheckedByName: item.checkedByName,
      CTitle: item.cTitle,
      RecivedByName: item.recivedByName,
      RTitle: item.rTitle,
      AuthorizedByName: item.authorizedByName,
      ATitle: item.aTitle,
      Model19Ref: item.model19Ref,
      Vat: item.vat,
      GrandTotal: item.grandTotal
    });

    if (item.status === 'Stores Recieved') {
      this.isFormEditable = false;
    } else {
      this.isFormEditable = true;
    }

    this.accessories.clear();
    this.extraItems.clear();

    if (item.accessories && Array.isArray(item.accessories)) {
      for (const acc of item.accessories) {
        this.accessories.push(this.fb.group({
          name: [acc.name, Validators.required],
          quantity: [acc.quantity, [Validators.required, Validators.min(1)]]
        }));
      }
    }

    if (item.extraItems && Array.isArray(item.extraItems)) {
      for (const extra of item.extraItems) {
        this.extraItems.push(this.fb.group({
          name: [extra.name, Validators.required],
          quantity: [extra.quantity, [Validators.required, Validators.min(1)]],
          store: [extra.store, Validators.required],
          extraStatus: [extra.extraStatus, Validators.required],
          extraRecivedByName: [extra.extraRecivedByName || ''] // Patch with empty string if undefined
        }));
      }
    }
  }

  onSubmit(id: string): void {
    if (this.editForm.valid) {
      this.errorMessage = null;
      this.successMessage = null;
      
      this.transitService.updateItem(id, this.editForm.value).subscribe({
        next: () => {
          this.successMessage = 'Item updated successfully!';
          setTimeout(() => {
            this.router.navigate(['/transit/received-items']);
          }, 1500);
        },
        error: (err) => {
          console.error('Update failed:', err);
          this.errorMessage = 'Failed to update item. Please try again.';
        }
      });
    } else {
      this.editForm.markAllAsTouched();
      this.errorMessage = 'Please fill all required fields correctly.';
    }
  }

  private prepareItemData(): Item {
    const formValue = this.editForm.value;
    return {
      ...formValue,
      accessories: this.accessories.value,
      extraItems: this.extraItems.value,
      date: new Date(formValue.Date)
    };
  }

  dateValidator(control: AbstractControl): ValidationErrors | null {
    const date = new Date(control.value);
    if (isNaN(date.getTime())) {
      return { invalidDate: true };
    }
    return null;
  }

  get isAnyExtraItemLocked(): boolean {
    return this.extraItems.controls.some(
      ctrl => ctrl.get('extraStatus')?.value === 'Stores Recieved'
    );
  }
}





// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';

// @Component({
//   selector: 'app-edit-item',
//   templateUrl: './edit-item.component.html',
//   styleUrls: ['./edit-item.component.css']
// })
// export class EditItemComponent implements OnInit {
//   editForm: FormGroup;
//   itemId: string = '';
//   isSubmitting = false;

//   constructor(
//     private fb: FormBuilder,
//     private route: ActivatedRoute,
//     public router: Router,
//     // inject your data service here, e.g. private itemService: ItemService
//   ) {
//     this.editForm = this.fb.group({
//       Supplier: ['', Validators.required],
//       Category: ['', Validators.required],
//       Model1Id: [''],
//       PRNO: [''],
//       Date: [''],
//       InvoiceNo: [''],
//       ItemType: [''],
//       ContactNumber: [''],
//       Number: [''],
//       RegisteredBy: [''],
//       SerialNumber: [''],
//       Description: [''],
//       UnitOfMeasurment: [''],
//       Currency: ['Birr'],
//       Ordered: [''],
//       Received: [''],
//       UnitOfPrice: [''],
//       Amount: [''],
//       Location: [''],
//       StoreType: [''],
//       Remark: [''],
//       CheckedByName: [''],
//       CTitle: [''],
//       RecivedByName: [''],
//       RTitle: [''],
//       AuthorizedByName: [''],
//       ATitle: [''],
//       Model19Ref: [''],
//       Status: ['Waiting For Stores'],

//       Accessories: this.fb.array([])  // <-- Accessories FormArray
//     });
//   }

//   ngOnInit(): void {
//     // get itemId from route params or other means
//     this.itemId = this.route.snapshot.paramMap.get('id') || '';

//     // Load item data for editing (simulate with dummy data or fetch from server)
//     this.loadData({
//       Supplier: 'Sample Supplier',
//       Category: 'Category A',
//       Model1Id: 'M123',
//       PRNO: 'PR456',
//       Date: '2025-07-29',
//       InvoiceNo: 'INV789',
//       ItemType: 'Type X',
//       ContactNumber: '0912345678',
//       Number: '10',
//       RegisteredBy: 'John Doe',
//       SerialNumber: 'SN001',
//       Description: 'Sample Item',
//       UnitOfMeasurment: 'pcs',
//       Currency: 'Birr',
//       Ordered: 100,
//       Received: 90,
//       UnitOfPrice: 50,
//       Amount: 4500,
//       Location: 'Addis Ababa',
//       StoreType: 'Main Store',
//       Remark: 'No remarks',
//       CheckedByName: 'Checker One',
//       CTitle: 'Manager',
//       RecivedByName: 'Receiver One',
//       RTitle: 'Supervisor',
//       AuthorizedByName: 'Authorizer One',
//       ATitle: 'Director',
//       Model19Ref: 'Ref001',
//       Status: 'Waiting For Stores',

//       Accessories: [
//         { name: 'Accessory 1', quantity: 2 },
//         { name: 'Accessory 2', quantity: 5 }
//       ]
//     });
//   }

//   // Convenience getter for Accessories FormArray
//   get accessories(): FormArray {
//     return this.editForm.get('Accessories') as FormArray;
//   }

//   // Add a new accessory control group
//   addAccessory() {
//     this.accessories.push(this.fb.group({
//       name: ['', Validators.required],
//       quantity: [1, [Validators.required, Validators.min(1)]]
//     }));
//   }

//   // Remove accessory at index
//   removeAccessory(index: number) {
//     this.accessories.removeAt(index);
//   }

//   // Load data into form and accessories
//   loadData(data: any) {
//     // Patch main form fields
//     this.editForm.patchValue({
//       Supplier: data.Supplier,
//       Category: data.Category,
//       Model1Id: data.Model1Id,
//       PRNO: data.PRNO,
//       Date: data.Date,
//       InvoiceNo: data.InvoiceNo,
//       ItemType: data.ItemType,
//       ContactNumber: data.ContactNumber,
//       Number: data.Number,
//       RegisteredBy: data.RegisteredBy,
//       SerialNumber: data.SerialNumber,
//       Description: data.Description,
//       UnitOfMeasurment: data.UnitOfMeasurment,
//       Currency: data.Currency,
//       Ordered: data.Ordered,
//       Received: data.Received,
//       UnitOfPrice: data.UnitOfPrice,
//       Amount: data.Amount,
//       Location: data.Location,
//       StoreType: data.StoreType,
//       Remark: data.Remark,
//       CheckedByName: data.CheckedByName,
//       CTitle: data.CTitle,
//       RecivedByName: data.RecivedByName,
//       RTitle: data.RTitle,
//       AuthorizedByName: data.AuthorizedByName,
//       ATitle: data.ATitle,
//       Model19Ref: data.Model19Ref,
//       Status: data.Status
//     });

//     // Clear current accessories
//     this.accessories.clear();

//     // Add accessories if exist
//     if (data.Accessories && Array.isArray(data.Accessories)) {
//       data.Accessories.forEach((acc: any) => {
//         this.accessories.push(this.fb.group({
//           name: [acc.name, Validators.required],
//           quantity: [acc.quantity, [Validators.required, Validators.min(1)]]
//         }));
//       });
//     }
//   }

//   // Submit handler
//   onSubmit(id: string) {
//     if (this.editForm.invalid) {
//       return;
//     }
//     this.isSubmitting = true;

//     const formValue = this.editForm.value;
//     console.log('Submitting edited item', id, formValue);

//     // TODO: Call your update API here and handle response

//     // Simulate submission done
//     setTimeout(() => {
//       this.isSubmitting = false;
//       alert('Item updated successfully!');
//       this.router.navigate(['/transit/received-items']);
//     }, 1500);
//   }
// }
