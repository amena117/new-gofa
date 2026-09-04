import { Component, OnInit } from '@angular/core';
import { MasterCardService } from '../../../services/mastercard.service';
import { MasterCardItem } from '../../models/mastercard.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mastercard-list',
  templateUrl: './mastercard-list.component.html',
  styleUrls: ['./mastercard-list.component.css']
})
export class MastercardListComponent implements OnInit {

  // Expose Math for template usage
  Math = Math;

  masterCards: MasterCardItem[] = [];
  filteredCards: MasterCardItem[] = [];
  paginatedCards: MasterCardItem[] = [];
  searchQuery = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  sortOptions = [
    { value: 'Model', viewValue: 'Model' },
    { value: 'PartNumber', viewValue: 'Part Number' },
    { value: 'Status', viewValue: 'Status' },
    { value: 'Date', viewValue: 'Date' }
  ];
  selectedSort = 'Model';

  locationFilterOptions = ['HF', 'VHF', 'Spare Part', 'Electronics'];
  selectedLocationFilters: string[] = [];

  private currentUserFullName: string | null = null;

  private locationKeywordMap: { [keyword: string]: string } = {
    'hf': 'HF',
    'vhf': 'VHF',
    'spare': 'Spare Part',
    'electronic': 'Electronics'
  };

  constructor(
    private masterCardService: MasterCardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserFullName = `${user.firstName} ${user.lastName || ''}`.trim();
    }
    this.loadCards();
  }

  loadCards(): void {
    this.masterCardService.getMasterCards().subscribe({
      next: (cards) => {
        this.masterCards = cards;
        this.autoSelectAllUserLocations();
        this.applyFilters();
      },
      error: (err) => console.error('Error loading cards:', err)
    });
  }

  autoSelectAllUserLocations(): void {
    if (!this.currentUserFullName) {
      this.selectedLocationFilters = [];
      return;
    }

    const userLocations = new Set<string>();
    const detect = (loc: string | undefined) => {
      if (!loc) return;
      const clean = loc.trim().toLowerCase();
      for (const [kw, canonical] of Object.entries(this.locationKeywordMap)) {
        if (clean.includes(kw)) {
          userLocations.add(canonical);
          return;
        }
      }
    };

    for (const card of this.masterCards) {
      (card.receivedRecords || []).forEach(r => {
        if (r.postedBy === this.currentUserFullName) detect(r.location);
      });
      (card.issuedRecords || []).forEach(i => {
        if (i.postedBy === this.currentUserFullName) detect(i.location);
      });
    }

    this.selectedLocationFilters = Array.from(userLocations);
  }

  toggleLocationFilter(loc: string): void {
    const i = this.selectedLocationFilters.indexOf(loc);
    if (i > -1) this.selectedLocationFilters.splice(i, 1);
    else this.selectedLocationFilters.push(loc);
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.selectedLocationFilters = [];
    this.applyFilters();
  }

  // PERFECT FILTERING LOGIC – YOUR FINAL REQUEST
  applyFilters(): void {
    // 1. Text search first
    let result = this.masterCards.filter(card => {
      if (!this.searchQuery.trim()) return true;
      const q = this.searchQuery.toLowerCase();
      return [card.model, card.partNumber, card.description, card.unitOfMeasure]
        .some(f => f?.toLowerCase().includes(q));
    });

    // 2. If location filter is active → filter + move N/A to bottom
    if (this.selectedLocationFilters.length > 0) {
      const keywords = this.selectedLocationFilters
        .map(f => Object.entries(this.locationKeywordMap).find(([_, c]) => c === f)?.[0])
        .filter(Boolean) as string[];

      const matching: MasterCardItem[] = [];
      const nonMatchingWithLocation: MasterCardItem[] = [];
      const noLocation: MasterCardItem[] = [];

      for (const card of result) {
        const hasLoc = this.hasAnyLocation(card);
        const matchesFilter = hasLoc && (
          (card.receivedRecords || []).some(r => r.location && keywords.some(k => r.location.trim().toLowerCase().includes(k))) ||
          (card.issuedRecords || []).some(i => i.location && keywords.some(k => i.location.trim().toLowerCase().includes(k)))
        );

        if (matchesFilter) {
          matching.push(card);
        } else if (hasLoc) {
          nonMatchingWithLocation.push(card);
        } else {
          noLocation.push(card);
        }
      }

      // Only show matching + N/A (N/A at bottom)
      result = [...matching, ...noLocation];
    }
    // Else: no filter → keep natural order (N/A mixed in normally)

    this.filteredCards = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  private hasAnyLocation(card: MasterCardItem): boolean {
    return (card.receivedRecords || []).some(r => !!r.location?.trim()) ||
           (card.issuedRecords || []).some(i => !!i.location?.trim());
  }

  onSearch(): void {
    this.applyFilters();
  }

  getDisplayLocations(item: MasterCardItem): string {
    const locations = new Set<string>();
    item.receivedRecords?.forEach(r => r.location?.trim() && locations.add(r.location.trim()));
    item.issuedRecords?.forEach(i => i.location?.trim() && locations.add(i.location.trim()));
    return locations.size === 0 ? 'N/A' : Array.from(locations).sort().join(', ');
  }

  // Pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCards.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedCards = this.filteredCards.slice(start, start + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  approveItem(item: MasterCardItem): void {
    console.log('Approve', item);
  }

  deleteItem(item: MasterCardItem): void {
    if (confirm(`Delete ${item.model} – ${item.partNumber}?`)) {
      console.log('Delete', item);
    }
  }
}