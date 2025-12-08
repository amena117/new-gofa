import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-maintenance-sparepart-request-form',
  templateUrl: './maintenance-sparepart-request-form.component.html',
  styleUrls: ['./maintenance-sparepart-request-form.component.css'],
})
export class MaintenanceSparePartRequestFormComponent implements OnInit {
  sparePartForm!: FormGroup;
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sparePartForm = this.fb.group({
      number: ['', Validators.required],
      partNumber: ['', Validators.required],
      equipmentType: ['', Validators.required],
      askedQuantity: [null, [Validators.required, Validators.min(1)]],
      askedUnit: ['', Validators.required],
      technicianName: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.sparePartForm.invalid) {
      alert('Please fill in all required fields.');
      return;
    }

    const formData = this.sparePartForm.value;

    // Use environment-based URL
    this.http.post(`${this.apiBaseUrl}/api/SparePartRequests`, formData).subscribe(
      (response) => {
        console.log('Spare part request submitted successfully:', response);
        alert('Spare part request submitted successfully.');
        this.resetForm();
        this.router.navigate(['/maintenance/request-list']); // Redirect to the maintenance request list page
      },
      (error) => {
        console.error('Error submitting spare part request:', error);
        alert('Failed to submit spare part request.');
      }
    );
  }

  resetForm(): void {
    this.sparePartForm.reset();
  }
}
