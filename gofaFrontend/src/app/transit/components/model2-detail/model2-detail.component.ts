import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Model2Service } from '../../services/model2.service';
import { Model2Item } from '../../models/model2.model';

@Component({
  selector: 'app-model2-detail',
  templateUrl: './model2-detail.component.html',
  styleUrl: './model2-detail.component.css'
})
export class Model2DetailComponent implements OnInit {
  item: any = null; // Use any to accommodate full DTO with arrays
  isLoading = true; // Track loading state
  errorMessage: string | null = null; // Track errors

  constructor(
    private route: ActivatedRoute,
    private model2Service: Model2Service
  ) {}

  ngOnInit() {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.loadItemDetails(itemId);
    } else {
      this.errorMessage = 'Invalid item ID.';
      this.isLoading = false;
    }
  }

  loadItemDetails(itemId: string) {
    this.isLoading = true;
    this.errorMessage = null;

    this.model2Service.getModel2ItemById(itemId).subscribe({
      next: (item) => {
        if (item) {
          this.item = item;
        } else {
          this.errorMessage = 'Item not found.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading item details:', err);
        this.errorMessage = 'Failed to load item details.';
        this.isLoading = false;
      }
    });
  }

  printDetails() {
    window.print();
  }
}