//import { Component } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';


@Component({
  selector: 'app-do-out',
  templateUrl: './do-out.component.html',
  styleUrl: './do-out.component.css'
})
export class DoOutComponent implements OnInit {
  doOutRequests: any[] = [];

  constructor(private maintenanceService: MaintenanceRequestService) {}

  ngOnInit(): void {
    this.loadDoOutRequests();
  }

  loadDoOutRequests(): void {
    this.maintenanceService.getDoOutRequests().subscribe({
      next: (data) => {
        this.doOutRequests = data;
      },
      // error: (err) => {
      //   // console.error('Error loading do out requests:', err);
      //   // alert('Do Out List is not available.');
      // }
    });
  }
}
