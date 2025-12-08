
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MasterCardService } from '../../../services/mastercard.service';

import { MasterCardItem } from '../../models/mastercard.model'

@Component({
  selector: 'app-mastercard-edit',
  templateUrl: './mastercard-edit.component.html',
  styleUrl: './mastercard-edit.component.css'
})
export class MastercardEditComponent implements OnInit {
  editForm!: FormGroup;
  itemId!: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private masterCardService: MasterCardService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.itemId = this.route.snapshot.paramMap.get('id')!;
    // if (this.itemId) {
    //   this.loadItemData(this.itemId);
    // } else {
    //   console.error('Item ID is missing!');
    // }
  }

  private initializeForm() {
    this.editForm = this.fb.group({
      masterCardId: ['', Validators.required],
      model: ['', Validators.required],
      partNumber: ['', Validators.required],
      description: ['', Validators.required],
      um: ['', Validators.required],
      inCHAb: ['', Validators.required],
      unitPack: ['', Validators.required],
      leadTime: ['', Validators.required],
      avgUsage: ['', Validators.required],
      ssl: ['', Validators.required],
      maxLevel: ['', Validators.required],
      recordPoint: ['', Validators.required],
      ved: ['', Validators.required],
      abc: ['', Validators.required],
      status: ['', Validators.required],
      orderTime: ['', Validators.required],
      location: ['', Validators.required],
      date: ['', Validators.required],
      orderNo: ['', Validators.required],
      consigning: ['', Validators.required],
      qytOrder: ['', Validators.required],
      qyt: ['', Validators.required],
      vocherNo: ['', Validators.required],
      received: ['', Validators.required],
      issued: ['', Validators.required],
      inStock: ['', Validators.required],
      unitPrice: ['', Validators.required],
      org: ['', Validators.required],
      postedby: ['', Validators.required]
    });
  }

  // private loadItemData(itemId: string) {
  //   this.masterCardService.getItemById(itemId).subscribe({
  //     next: (item) => {
  //       this.patchFormValues(item);
  //       const formattedDate = this.formatDate(item.date);
  //       this.editForm.patchValue({ ...item, Date: formattedDate });
  //     },
  //     error: (err) => console.error('Error loading item:', err)
  //   });
  // }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  private patchFormValues(item: MasterCardItem) {
    this.editForm.patchValue(item);
  }

  onSubmit(id: string) {
    if (this.editForm.valid) {
      this.masterCardService.updateItem(id, this.editForm.value).subscribe({
        next: () => this.router.navigate(['/transit/received-items']),
        error: (err) => console.error('Update failed:', err)
      });
    }
  }
}

