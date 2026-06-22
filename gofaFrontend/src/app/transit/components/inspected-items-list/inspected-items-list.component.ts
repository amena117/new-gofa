import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-inspected-items-list',
  templateUrl: './inspected-items-list.component.html',
  styleUrl: './inspected-items-list.component.css'
})
export class InspectedItemsListComponent implements OnInit {
  inspectedItems: Item[] = [];

  constructor(private transitService: TransitService) {}

  ngOnInit() {
    this.transitService.getInspectedItems().subscribe((items) => {
      // Show newest first
      this.inspectedItems = items.sort((a, b) => (b.model1Id || 0) - (a.model1Id || 0));
    });
  }
  receiveItem(itemId: number) {
    this.transitService.receiveFromInspection(itemId).subscribe((response) => {
      console.log('Item received:', response);
      // Update the list after receiving the item
      this.ngOnInit();
    });
  }
}
