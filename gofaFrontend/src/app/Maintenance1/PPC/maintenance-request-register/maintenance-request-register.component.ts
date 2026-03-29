// src/app/components/maintenance-request-register/maintenance-request-register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { Letter } from '../../Models/letter.model'; // ✅ Import Letter model


@Component({
  selector: 'app-maintenance-request-register',
  templateUrl: './maintenance-request-register.component.html',
  styleUrls: ['./maintenance-request-register.component.css']
})
export class MaintenanceRequestRegisterComponent implements OnInit {
  maintenanceForm!: FormGroup;
  equipmentTypes: any[] = [];
  letters: Letter[] = [];
  statusStageOptions = [
    { value: 'POWER', label: 'POWER' },
    { value: 'OFFICE_MACHINE', label: 'OFFICE MACHINE' },
    { value: 'VHF_RADIO', label: 'VHF Radio' },
    { value: 'HF_RADIO', label: 'HF Radio' }
  ];
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private maintenanceRequestService: MaintenanceRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.maintenanceForm = this.fb.group({
      letterId: ['', Validators.required],
      worksOrderNumber: ['', Validators.required],
      nomenclature: ['', Validators.required],
      quantity: [{ value: 1, disabled: true }],
      requestedBy: ['', Validators.required],
      serialNoOfEquip: ['', Validators.required],
      briefDescriptionOfWork: ['', Validators.required],
      dateWorkOrderReceived: [new Date().toISOString().split('T')[0], Validators.required],
      repairStartDate: [null],
      repairFinishDate: [null],
      manHours: [0, [Validators.required, Validators.min(0)]],
      partsCost: [0, [Validators.required, Validators.min(0)]],
      remark: [''],
      equipmentTypeId: ['', Validators.required],
      currentHandler: [{ value: 'PPC', disabled: true }, Validators.required],
      statusStage: ['', Validators.required],
    });

    this.maintenanceRequestService.getEquipmentTypes().subscribe(
      (types: any[]) => this.equipmentTypes = types,
      (err: any) => console.error('Error loading equipment types', err)
    );

    this.maintenanceRequestService.getInitialLetters().subscribe(
      (letters: Letter[]) => this.letters = letters,
      (err: any) => console.error('Error loading letters', err)
    );
  }

  isSubmitting = false;

  onSubmit(): void {
    this.submitted = true;
    if (this.maintenanceForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    const formData = {
      letterId: this.maintenanceForm.get('letterId')?.value,
      worksOrderNumber: this.maintenanceForm.get('worksOrderNumber')?.value,
      nomenclature: this.maintenanceForm.get('nomenclature')?.value,
      quantity: 1,
      requestedBy: this.maintenanceForm.get('requestedBy')?.value,
      serialNoOfEquip: this.maintenanceForm.get('serialNoOfEquip')?.value,
      briefDescriptionOfWork: this.maintenanceForm.get('briefDescriptionOfWork')?.value,
      dateWorkOrderReceived: this.maintenanceForm.get('dateWorkOrderReceived')?.value,
      equipmentTypeId: this.maintenanceForm.get('equipmentTypeId')?.value,
      currentHandler: this.maintenanceForm.get('currentHandler')?.value,
      statusStage: this.maintenanceForm.get('statusStage')?.value,
    };

    this.maintenanceRequestService.submitMaintenanceRequest(formData).subscribe(
      (response) => {
        console.log('Maintenance request submitted successfully:', response);
        alert('Maintenance request submitted successfully!');
        this.router.navigate(['maintenance/request-list']);
        this.resetForm();
        this.isSubmitting = false;
      },
      (error) => {
        console.error('Error submitting maintenance request:', error);
        if (error.status === 409) {
          alert('A maintenance request with this Works Order Number already exists.');
        } else {
          alert('Failed to submit maintenance request. Please try again.');
        }
        this.isSubmitting = false;
      }
    );
  }

  resetForm(): void {
    this.maintenanceForm.reset();
    this.submitted = false;
  }

  clearForm(): void {
    this.submitted = false;
    this.maintenanceForm.reset();
  }
}