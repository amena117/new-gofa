import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { Letter } from '../../Models/letter.model';

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
    { value: 'RADIO_MAINTENANCE', label: 'RADIO_MAINTENANCE' }
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
      model: ['', Validators.required],
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

    // Load equipment types
    this.maintenanceRequestService.getEquipmentTypes().subscribe(
      (types: any[]) => this.equipmentTypes = types,
      (err: any) => console.error('Error loading equipment types', err)
    );

    // Load letters
    this.maintenanceRequestService.getInitialLetters().subscribe(
      (letters: Letter[]) => this.letters = letters,
      (err: any) => console.error('Error loading letters', err)
    );
  }

  /** Auto-fill worksOrderNumber using selected Letter ID */
onLetterChange(event: Event): void {
  const selectElement = event.target as HTMLSelectElement;
  const letterId = parseInt(selectElement.value, 10); // convert to number

  if (!isNaN(letterId)) {
    // Set worksOrderNumber to the selected letterId
    this.maintenanceForm.get('worksOrderNumber')?.setValue(letterId);

    // Find the selected letter from the letters array
    const selectedLetter = this.letters.find(letter => letter.letterId === letterId);

    if (selectedLetter) {
      // Auto-fill 'Requested By' from letter
      this.maintenanceForm.get('requestedBy')?.setValue(selectedLetter.from || '');
    }
  } else {
    this.maintenanceForm.get('worksOrderNumber')?.setValue('');
    this.maintenanceForm.get('requestedBy')?.setValue('');
  }
}



  onSubmit(): void {
    this.submitted = true;

    if (this.maintenanceForm.invalid) return;

    const formData = {
      letterId: this.maintenanceForm.get('letterId')?.value,
      worksOrderNumber: this.maintenanceForm.get('worksOrderNumber')?.value,
      nomenclature: this.maintenanceForm.get('nomenclature')?.value,
      model: this.maintenanceForm.get('model')?.value,
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
      },
      (error) => {
        console.error('Error submitting maintenance request:', error);
        if (error.status === 409) {
          // Conflict - duplicate WorksOrderNumber
          alert(`Error: A maintenance request with Works Order Number ${formData.worksOrderNumber} already exists. Please use a different Works Order Number.`);
        } else {
          alert(`Failed to submit maintenance request: ${error.error?.message || 'Unknown error'}`);
        }
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
