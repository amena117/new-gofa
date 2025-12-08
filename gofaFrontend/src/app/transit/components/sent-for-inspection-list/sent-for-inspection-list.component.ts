import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-sent-for-inspection-list',
  templateUrl: './sent-for-inspection-list.component.html',
  styleUrls: ['./sent-for-inspection-list.component.css'],
})
export class SentForInspectionListComponent implements OnInit {
  sentForInspectionItems: Item[] = [];

  constructor(private transitService: TransitService) {}

  ngOnInit() {
    this.transitService.getSentForInspection().subscribe((items) => {
      this.sentForInspectionItems = items;
    });
  }
}
