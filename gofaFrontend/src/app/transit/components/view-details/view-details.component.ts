import { Component, OnInit, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-view-details',
  templateUrl: './view-details.component.html',
  styleUrls: ['./view-details.component.css']
})
export class ViewDetailsComponent implements OnInit {
  item: Item | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  isCapturing = false; // hides buttons during PDF capture

  constructor(
    private route: ActivatedRoute,
    private transitService: TransitService,
    private authService: AuthService,
    private el: ElementRef
  ) { }

  ngOnInit() {
    const itemId = this.route.snapshot.paramMap.get('id')!;
    this.loadItemDetails(itemId);
  }

  loadItemDetails(itemId: string) {
    this.isLoading = true;
    this.errorMessage = null;

    this.transitService.getItemById(itemId).subscribe({
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

  canEdit(): boolean {
    const role = this.authService.getRole();
    return role === 'TRANSIT' || role === 'SUPER_ADMIN';
  }

  isStoreUser(): boolean {
    const role = this.authService.getRole();
    return role === 'VHF' || role === 'HF' || role === 'ELECTRONICS' || role === 'SPAREPART';
  }

  expandedSubAccessories = new Set<number>();

  toggleSubAccessories(index: number): void {
    if (this.expandedSubAccessories.has(index)) {
      this.expandedSubAccessories.delete(index);
    } else {
      this.expandedSubAccessories.add(index);
    }
  }

  isSubAccessoriesOpen(index: number): boolean {
    return this.expandedSubAccessories.has(index);
  }

  getStatusForCurrentUser(): string {
    if (!this.item) return 'Unknown';
    
    const userRole = this.authService.getRole()?.toLowerCase();
    
    // Check if main item is for this store
    if (this.item.storeType?.toLowerCase() === userRole) {
      return this.item.status || 'Waiting For Stores';
    }
    
    // Check if there's an extra item for this store
    const extraForThisStore = this.item.extraItems?.find(
      extra => extra.store?.toLowerCase() === userRole
    );
    
    if (extraForThisStore) {
      return extraForThisStore.extraStatus || 'Waiting For Stores';
    }
    
    return this.item.status || 'Unknown';
  }

  formatPrice(price: number | string | null | undefined, currency: string | null | undefined): string {
    if (!price || price === 0) {
      return '0.00 ' + (currency || 'ETB');
    }
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) {
      return '0.00 ' + (currency || 'ETB');
    }
    
    return numPrice.toFixed(2) + ' ' + (currency || 'ETB');
  }

  getTotalValue(): string {
    if (!this.item) {
      return '0.00 ETB';
    }

    let totalValue = 0;
    
    if (this.item.grandTotal && this.item.grandTotal > 0) {
      totalValue = this.item.grandTotal;
    } else if (this.item.amount && this.item.amount > 0) {
      totalValue = this.item.amount;
    } else if (this.item.unitOfPrice && this.item.received) {
      const unitPrice = typeof this.item.unitOfPrice === 'string' ? parseFloat(this.item.unitOfPrice) : this.item.unitOfPrice;
      if (!isNaN(unitPrice)) {
        totalValue = unitPrice * this.item.received;
      }
    }

    return this.formatPrice(totalValue, this.item.currency);
  }

  async downloadAsPDF() {
    if (!this.item) return;

    // Expand all sub-accessories so they appear in the capture
    const prevExpanded = new Set(this.expandedSubAccessories);
    this.item.accessories?.forEach((_, i) => this.expandedSubAccessories.add(i));

    // Hide interactive elements during capture
    this.isCapturing = true;
    await new Promise(r => setTimeout(r, 150));

    try {
      const container: HTMLElement = this.el.nativeElement.querySelector('.details-container')
                                  || this.el.nativeElement;

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageWidth - margin * 2;
      const usableH = pageHeight - margin * 2;

      // Total rendered height in mm
      const totalHeightMm = (canvas.height * usableW) / canvas.width;
      const totalPages = Math.ceil(totalHeightMm / usableH);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // Slice the canvas for this page
        const srcY = Math.round((page * usableH * canvas.width) / usableW);
        const srcH = Math.round((usableH * canvas.width) / usableW);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(srcH, canvas.height - srcY);
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, pageCanvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);

        const pageImg = pageCanvas.toDataURL('image/png');
        const sliceHeightMm = (pageCanvas.height * usableW) / canvas.width;
        pdf.addImage(pageImg, 'PNG', margin, margin, usableW, sliceHeightMm);
      }

      pdf.save(`ItemDetails_${this.item.model1Id || 'Report'}.pdf`);
    } finally {
      this.isCapturing = false;
      this.expandedSubAccessories = prevExpanded;
    }
  }

  printDetails() {
    window.print();
  }
}
