import { Component, OnInit } from '@angular/core';
import { MaintenanceService, MaintenanceRegister } from '../services/maintenance.service';

@Component({
  selector: 'app-maintenance-register-list',
  templateUrl: './maintenance-register-list.component.html',
  styleUrls: ['./maintenance-register-list.component.css'],
})
export class MaintenanceRegisterListComponent implements OnInit {
  registers: MaintenanceRegister[] = [];

  constructor(private maintenanceService: MaintenanceService) {}

  ngOnInit(): void {
    this.maintenanceService.getMaintenanceRegisters().subscribe(
      (data) => {
        this.registers = data;
      },
      (error) => {
        console.error('Error fetching Maintenance Registers:', error);
      }
    );
  }
}