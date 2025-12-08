// view-details.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-view-details',
  templateUrl: './view-details.component.html',
  styleUrls: ['./view-details.component.css']
})
export class ViewDetailsComponent implements OnInit {
  item: Item | null = null; // Initialize as null
  isLoading = true; // Track loading state
  errorMessage: string | null = null; // Track errors

  constructor(
    private route: ActivatedRoute,
    private transitService: TransitService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const itemId = this.route.snapshot.paramMap.get('id')!; // Use non-null assertion
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
          this.errorMessage = 'Item not found.'; // Handle case where item is undefined
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading item details:', err);
        this.errorMessage = 'Failed to load item details.'; // Handle errors
        this.isLoading = false;
      }
    });
  }
  canEdit(): boolean {
  return !this.authService.hasRole('PROPERTY_CONTROL');
}
  printDetails() {
  const data = document.getElementById('printable-card');
  if (!data) {
    console.warn('Printable element not found');
    return;
  }
  

  // Hide non-printable elements (buttons)
  const noPrintElements = data.querySelectorAll('.no-print');
  noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

  // Add export class for print styling
  data.classList.add('pdf-export');

  // Capture the card with html2canvas
  html2canvas(data, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false // optional: reduce console noise
  })
  .then(canvas => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 190; // leave 10mm left/right margin
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 10; // Start near top
    let heightLeft = imgHeight;

    // Add image to first page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);

    // Handle overflow onto new pages
    heightLeft -= pageHeight - position - 10; // 10mm bottom margin

    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 10 - heightLeft, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Optional: Add confidential footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(180);
      pdf.text('Confidential - Internal Use Only', 105, pageHeight - 10, { align: 'center' });
      pdf.setTextColor(0);
    }

    // Save PDF
    const fileName = `ItemDetails_${this.item?.model1Id || 'Report'}.pdf`;
    pdf.save(fileName);

    // Restore UI
    noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
    data.classList.remove('pdf-export');
  })
  .catch(error => {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    data.classList.remove('pdf-export');
  });
}

}
