import { Component, OnInit } from '@angular/core';
import { SParePartsRequestService } from '../services/spare-parts-request.service';
import { SParePartsRequest } from '../Models/SParePartsRequest';
import { RouterModule } from '@angular/router'; // ✅ Correct import

@Component({
  selector: 'app-spare-parts-request-list',
  templateUrl: './spare-parts-request-list.component.html',
  styleUrls: ['./spare-parts-request-list.component.css']
})
export class SparePartsRequestListComponent implements OnInit {
  sparePartsRequests: SParePartsRequest[] = [];

  constructor(private sparePartsRequestService: SParePartsRequestService) {}

  ngOnInit(): void {
    this.loadSparePartsRequests();
  }

  loadSparePartsRequests(): void {
    this.sparePartsRequestService.getSparePartsRequests().subscribe(
      (data) => {
        this.sparePartsRequests = data;
      },
      (error) => {
        console.error('Error fetching spare parts requests:', error);
      }
    );
  }

  deleteRequest(id: number | undefined): void {
    if (!id) {
      console.error('Cannot delete request: ID is undefined.');
      return;
    }
  
    if (confirm('Are you sure you want to delete this request?')) {
      this.sparePartsRequestService.deleteSparePartsRequest(id).subscribe(
        () => {
          this.loadSparePartsRequests(); // Refresh the list after deletion
        },
        (error) => {
          console.error('Error deleting spare parts request:', error);
        }
      );
    }
  }
}