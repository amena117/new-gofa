import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SParePartsRequestService } from '../services/spare-parts-request.service';
import { SParePartsRequest } from '../Models/SParePartsRequest';

@Component({
  selector: 'app-spare-parts-request-details',
  templateUrl: './spare-parts-request-details.component.html',
  styleUrls: ['./spare-parts-request-details.component.css']
})
export class SparePartsRequestDetailsComponent implements OnInit {
  request: SParePartsRequest | null = null;

  constructor(
    private route: ActivatedRoute,
    private sparePartsRequestService: SParePartsRequestService
  ) {}

  ngOnInit(): void {
    const requestId = +this.route.snapshot.paramMap.get('id')!;
    this.loadRequestDetails(requestId);
  }

  loadRequestDetails(id: number): void {
    this.sparePartsRequestService.getSparePartsRequestById(id).subscribe(
      (data) => {
        this.request = data;
      },
      (error) => {
        console.error('Error loading spare parts request details:', error);
      }
    );
  }
}