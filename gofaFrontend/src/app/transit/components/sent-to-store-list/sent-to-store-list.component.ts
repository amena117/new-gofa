import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-sent-to-store-list',
  templateUrl: './sent-to-store-list.component.html',
  styleUrls: ['./sent-to-store-list.component.css'],
})
export class SentToStoreListComponent implements OnInit {
  sentToStoreItems: Item[] = [];

  constructor(private transitService: TransitService) {}

  ngOnInit() {
    this.transitService.getSentToStore().subscribe((items) => {
      this.sentToStoreItems = items;
    });
  }
}
