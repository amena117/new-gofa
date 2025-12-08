import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SpecialToolsRegisterService } from '../services/special-tools-register.service';
import { SpecialToolsRegister } from '../Models/special-tools-register';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-special-tools-register-form',
  imports: [
  CommonModule,
  FormsModule,
  ReactiveFormsModule // if needed
],
  templateUrl: './special-tools-register-form.component.html',
  styleUrls: ['./special-tools-register-form.component.css'],
  standalone: true,
  providers: [SpecialToolsRegisterService]
})
export class SpecialToolsRegisterFormComponent implements OnInit {
  requestForm!: FormGroup;
  isEditMode = false;
  recordId?: number;
  specialToolsRegisters: SpecialToolsRegister[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private specialToolsRegisterService: SpecialToolsRegisterService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.fetchSpecialToolsRegisters();

    this.route.params.subscribe((params) => {
      this.recordId = params['id'];
      if (this.recordId) {
        this.isEditMode = true;
        this.loadRecordDetails(this.recordId);
      }
    });
  }

  initializeForm(): void {
    this.requestForm = this.fb.group({
      toolName: ['', Validators.required],
      recievedBy: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
      recievedDate: [new Date().toISOString().slice(0, 16), Validators.required], // Default to current datetime
      givenBy: ['', Validators.required],
      returnDate: [''], // Optional field
    });
  }

  fetchSpecialToolsRegisters(): void {
    this.specialToolsRegisterService.getSpecialToolsRegisters().subscribe(
      (data) => {
        this.specialToolsRegisters = data;
      },
      (error) => {
        console.error('Error fetching special tools registers:', error);
      }
    );
  }

  loadRecordDetails(id: number): void {
    this.specialToolsRegisterService.getSpecialToolsRegisterById(id).subscribe(
      (data) => {
        this.requestForm.patchValue(data);
      },
      (error) => {
        console.error('Error loading special tools register details:', error);
      }
    );
  }

  onSubmit(): void {
    if (this.requestForm.invalid) {
      return;
    }

    const formData = this.requestForm.value;

    if (this.isEditMode && this.recordId) {
      this.specialToolsRegisterService.updateSpecialToolsRegister(this.recordId, formData).subscribe(
        () => {
          alert('Special tools register updated successfully!');
          this.router.navigate(['/maintenance/special-tools-register']);
        },
        (error) => {
          console.error('Error updating special tools register:', error);
        }
      );
    } else {
      this.specialToolsRegisterService.createSpecialToolsRegister(formData).subscribe(
        () => {
          alert('Special tools register created successfully!');
          this.fetchSpecialToolsRegisters(); // Refresh the table
          this.requestForm.reset();
        },
        (error) => {
          console.error('Error creating special tools register:', error);
        }
      );
    }
  }

  editRecord(id: number): void {
    this.router.navigate(['/maintenance/special-tools-register', id]);
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    this.specialToolsRegisterService.deleteSpecialToolsRegister(id).subscribe(
      () => {
        alert('Special tools register deleted successfully!');
        this.fetchSpecialToolsRegisters(); // Refresh the table
      },
      (error) => {
        console.error('Error deleting special tools register:', error);
      }
    );
  }
}