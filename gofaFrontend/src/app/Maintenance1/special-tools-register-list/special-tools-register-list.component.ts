import { Component, OnInit } from '@angular/core';
import { SpecialToolsRegisterService } from '../services/special-tools-register.service';
import { SpecialToolsRegister } from '../Models/special-tools-register';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-special-tools-register-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [SpecialToolsRegisterService],
  standalone: true,
  templateUrl: './special-tools-register-list.component.html',
  styleUrls: ['./special-tools-register-list.component.css'],
})
export class SpecialToolsRegisterListComponent implements OnInit {
  specialToolsRegisters: SpecialToolsRegister[] = [];
  editingRecord: SpecialToolsRegister | null = null;

  constructor(private specialToolsRegisterService: SpecialToolsRegisterService) {}

  ngOnInit(): void {
    this.loadSpecialToolsRegisters();
  }

  loadSpecialToolsRegisters(): void {
    this.specialToolsRegisterService.getSpecialToolsRegisters().subscribe(
      (data) => {
        this.specialToolsRegisters = data;
      },
      (error) => {
        console.error('Error loading special tools registers:', error);
      }
    );
  }

  deleteSpecialToolsRegister(id: number): void {
    if (confirm('Are you sure you want to delete this record?')) {
      this.specialToolsRegisterService.deleteSpecialToolsRegister(id).subscribe(
        () => {
          this.loadSpecialToolsRegisters();
        },
        (error) => {
          console.error('Error deleting special tools register:', error);
        }
      );
    }
  }

  returnTool(record: SpecialToolsRegister): void {
  if (record.returnedDate) {
    alert('This tool has already been returned.');
    return;
  }

  const now = new Date();

  this.specialToolsRegisterService.updateReturnedDate(record.id, now).subscribe(
    () => {
      record.returnedDate = now; // update UI
    },
    (error) => {
      console.error('Error updating return date:', error);
    }
  );
}




  openEditModal(record: SpecialToolsRegister): void {
    // Clone the record for safe editing
    this.editingRecord = { ...record } as SpecialToolsRegister;
  }

  closeEditModal(): void {
    this.editingRecord = null;
  }

  saveEdit(): void {
    if (!this.editingRecord) return;

    this.specialToolsRegisterService
      .updateSpecialToolsRegister(this.editingRecord.id, this.editingRecord)
      .subscribe(
        () => {
          const index = this.specialToolsRegisters.findIndex(r => r.id === this.editingRecord!.id);
          if (index > -1) {
            this.specialToolsRegisters[index] = { ...this.editingRecord! };
          }
          this.closeEditModal();
        },
        (error) => {
          console.error('Error saving record:', error);
        }
      );
  }
}
