
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterCardService } from '../../../services/mastercard.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mastercard-form',
  templateUrl: './mastercard-form.component.html',
  styleUrl: './mastercard-form.component.css',
})
export class MasterCardFormComponent {
  masterCardForm: FormGroup;

  constructor(private fb: FormBuilder, private masterCardService: MasterCardService, private router: Router) {
    this.masterCardForm = this.fb.group({
      // masterCardId: ['', Validators.required],
      model: ['', Validators.required],
      partNumber: ['', Validators.required],
      description: ['', Validators.required],
      unitOfMeasure: ['', Validators.required],
      inCHAb: ['', Validators.required],
      unitPack: ['', Validators.required],
      cardNo:['',Validators.required],
      status:['',Validators.required],
   
    });
  }

  onSubmit() {
    if (this.masterCardForm.valid) {
      const formData = this.masterCardForm.value;
      console.log('Form Data:', formData);

      this.masterCardService.saveMasterCard(formData).subscribe(response => {
        console.log('MasterCard data saved successfully:', response);
        this.router.navigate(['/MasterCard/mastercard-list']);
      }, error => {
        console.error('Error saving data:', error);
      });
    }
  }
}

