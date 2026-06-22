import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { AuthService } from '../../../services/auth.service';
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
  currentUserFirstName: string = '';
  currentUserLastName: string = '';

  constructor(
    private fb: FormBuilder,
    private maintenanceRequestService: MaintenanceRequestService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get current user information and combine first and last name
    this.currentUserFirstName = this.authService.getFirstName() || '';
    this.currentUserLastName = this.authService.getLastName() || '';
    const fullName = `${this.currentUserFirstName} ${this.currentUserLastName}`.trim();

    this.maintenanceForm = this.fb.group({
      letterId: ['', Validators.required],
      worksOrderNumber: [''], // Removed required validator
      nomenclature: [''], // Removed required validator
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
      registeredBy: [{ value: fullName, disabled: true }],
    });

    // Load equipment types
    this.maintenanceRequestService.getEquipmentTypes().subscribe(
      (types: any[]) => this.equipmentTypes = types,
      (err: any) => console.error('Error loading equipment types', err)
    );

    // Load letters — most recent (highest ID) first
    this.maintenanceRequestService.getInitialLetters().subscribe(
      (letters: Letter[]) => this.letters = letters.slice().sort((a, b) => b.letterId - a.letterId),
      (err: any) => console.error('Error loading letters', err)
    );
  }

  /** Auto-fill requestedBy using selected Letter */
onLetterChange(event: Event): void {
  const selectElement = event.target as HTMLSelectElement;
  const letterId = parseInt(selectElement.value, 10); // convert to number

  if (!isNaN(letterId)) {
    // Find the selected letter from the letters array
    const selectedLetter = this.letters.find(letter => letter.letterId === letterId);

    if (selectedLetter) {
      // Auto-fill 'Requested By' from letter
      this.maintenanceForm.get('requestedBy')?.setValue(selectedLetter.from || '');
    }
  } else {
    this.maintenanceForm.get('requestedBy')?.setValue('');
  }
}



  onSubmit(): void {
    this.submitted = true;

    if (this.maintenanceForm.invalid) return;

    // Get the registered by value (enabled temporarily to get the value)
    const registeredByValue = `${this.currentUserFirstName} ${this.currentUserLastName}`.trim();

    // Get the selected equipment type name to use as nomenclature
    const equipmentTypeId = this.maintenanceForm.get('equipmentTypeId')?.value;
    const selectedEquipmentType = this.equipmentTypes.find(t => t.equipmentTypeId === +equipmentTypeId);
    const nomenclatureValue = selectedEquipmentType ? selectedEquipmentType.equipmentTypeName : null;

    const formData = {
      letterId: parseInt(this.maintenanceForm.get('letterId')?.value) || null,
      worksOrderNumber: this.maintenanceForm.get('worksOrderNumber')?.value || null,
      nomenclature: nomenclatureValue, // ✅ Auto-fill with equipment type name
      model: this.maintenanceForm.get('model')?.value,
      quantity: 1,
      requestedBy: this.maintenanceForm.get('requestedBy')?.value,
      serialNoOfEquip: this.maintenanceForm.get('serialNoOfEquip')?.value,
      briefDescriptionOfWork: this.maintenanceForm.get('briefDescriptionOfWork')?.value,
      dateWorkOrderReceived: this.maintenanceForm.get('dateWorkOrderReceived')?.value,
      equipmentTypeId: parseInt(this.maintenanceForm.get('equipmentTypeId')?.value) || 0,
      currentHandler: 'PPC', // Always PPC for this form
      statusStage: this.maintenanceForm.get('statusStage')?.value,
      registeredBy: registeredByValue, // ✅ NEW: Include who registered this request
    };

    console.log('Submitting form data:', formData); // Debug log

    this.maintenanceRequestService.submitMaintenanceRequest(formData).subscribe(
      (response) => {
        console.log('Maintenance request submitted successfully:', response);
        alert('Maintenance request submitted successfully!');
        this.router.navigate(['maintenance/request-list']);
        this.resetForm();
      },
      (error) => {
        console.error('Error submitting maintenance request:', error);
        console.error('Error details:', error.error); // Log full error details
        
        if (error.status === 409) {
          // Conflict - duplicate WorksOrderNumber
          alert(`Error: A maintenance request with Works Order Number ${formData.worksOrderNumber} already exists. Please use a different Works Order Number.`);
        } else if (error.status === 400 && error.error?.errors) {
          // Validation errors
          const validationErrors = Object.entries(error.error.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          alert(`Validation errors:\n${validationErrors}`);
        } else {
          alert(`Failed to submit maintenance request: ${error.error?.message || error.message || 'Unknown error'}`);
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
