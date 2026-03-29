import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaintenanceRequestService } from '../../services/maintenance-request.service';

@Component({
  selector: 'app-edit-request',
  templateUrl: './edit-request.component.html',
  styleUrls: ['./edit-request.component.css']
})
export class EditRequestComponent implements OnInit {
  editForm!: FormGroup;
  maintenanceRequest: any = null; // Holds the selected maintenance request
  isLoading = true; // Indicates if data is being loaded
  error: string | null = null; // Stores error messages
  submitted = false; // Tracks form submission

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private maintenanceRequestService: MaintenanceRequestService
  ) {}

  ngOnInit(): void {
    // Get the worksOrderNumber from the route parameters
    const worksOrderNumber = +this.route.snapshot.paramMap.get('id')!;
    this.fetchMaintenanceRequest(worksOrderNumber);
  }

  fetchMaintenanceRequest(worksOrderNumber: number): void {
    this.isLoading = true;
   this.maintenanceRequestService.getMaintenanceRequestById(worksOrderNumber).subscribe(
      (data) => {
        this.maintenanceRequest = data;
        this.initializeForm();
        this.isLoading = false;
      },
      (error) => {
        this.error = 'Failed to load maintenance request details.';
        this.isLoading = false;
        console.error('Error fetching maintenance request:', error);
      }
    );
  }

  initializeForm(): void {
    this.editForm = this.fb.group({
      worksOrderNumber: [this.maintenanceRequest.worksOrderNumber],
      nomenclature: [this.maintenanceRequest.nomenclature, Validators.required],
      quantity: [this.maintenanceRequest.quantity, [Validators.required, Validators.min(1)]],
      requestedBy: [this.maintenanceRequest.requestedBy, Validators.required],
      serialNoOfEquip: [this.maintenanceRequest.serialNoOfEquip, Validators.required],
      briefDescriptionOfWork: [this.maintenanceRequest.briefDescriptionOfWork, Validators.required],
      dateWorkOrderReceived: [this.maintenanceRequest.dateWorkOrderReceived, Validators.required],
      repairStartDate: [this.maintenanceRequest.repairStartDate],
      repairFinishDate: [this.maintenanceRequest.repairFinishDate],
      manHours: [this.maintenanceRequest.manHours, Validators.min(0)],
      partsCost: [this.maintenanceRequest.partsCost, Validators.min(0)],
      remark: [this.maintenanceRequest.remark]
    });
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.editForm.invalid) {
      return;
    }

    const id = this.maintenanceRequest.id;
    const updateData = {
      nomenclature: this.editForm.get('nomenclature')?.value,
      quantity: this.editForm.get('quantity')?.value,
      requestedBy: this.editForm.get('requestedBy')?.value,
      serialNoOfEquip: this.editForm.get('serialNoOfEquip')?.value,
      briefDescriptionOfWork: this.editForm.get('briefDescriptionOfWork')?.value,
      dateWorkOrderReceived: this.editForm.get('dateWorkOrderReceived')?.value,
      equipmentTypeId: this.maintenanceRequest.equipmentTypeId
    };

    console.log('Updating maintenance request with ID:', id, 'Data:', updateData);

    this.maintenanceRequestService.updateMaintenanceRequestById(id, updateData).subscribe(
      () => {
        alert('Maintenance request updated successfully!');
        this.router.navigate(['/maintenance/request-list']);
      },
      (error) => {
        this.error = 'Failed to update maintenance request.';
        console.error('Error updating maintenance request:', error);
        alert('Failed to update maintenance request. Please try again.');
      }
    );
  }
}