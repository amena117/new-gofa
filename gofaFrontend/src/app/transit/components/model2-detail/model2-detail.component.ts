import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Model2Service } from '../../services/model2.service';
import { Model2Item } from '../../models/model2.model';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type locally to fix TypeScript errors
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

@Component({
  selector: 'app-model2-detail',
  templateUrl: './model2-detail.component.html',
  styleUrl: './model2-detail.component.css'
})
export class Model2DetailComponent implements OnInit {
  item: any = null;
  isLoading = true;
  errorMessage: string | null = null;

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

  downloadAsPDF() {
    if (!this.item) return;

    const pdf = new jsPDF('p', 'mm', 'a4') as jsPDFWithAutoTable;
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transaction Record Details / የግብይት መዝገብ ዝርዝር', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 5;
    pdf.setLineWidth(0.5);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // General Information Section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('General Information / አጠቃላይ መረጃ', 20, yPos);
    yPos += 2;
    pdf.setLineWidth(0.3);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    const generalInfoData = [
      ['Date / ቀን', this.item.date || 'Unknown'],
      ['Issue Voucher No / የመውጫ ሰነድ ቁጥር', this.item.issueVocNo || 'Unknown'],
      ['Voucher Number / የሰነድ ቁጥር', this.item.voucherNumber || 'Unknown'],
      ['Transaction Type / የግብይት አይነት', this.item.transType || 'Unknown'],
      ['Requesting Unit / ጠያቂ ክፍል', this.item.requestingUnit || 'Unknown'],
      ['Issuing Store / አቅራቢ ግምጃ ቤት', this.item.issuingStore || 'Unknown'],
      ['Make & Model / ሰሪ እና ሞዴል', this.item.model || 'Unknown'],
      ['Registered By / የመዘገበው', this.item.registeredBy || 'Unknown'],
      ['Status / ሁኔታ', this.item.status || 'Pending'],
      ['Category / ምድብ', this.item.category || 'Unknown']
    ];

    autoTable(pdf, {
      startY: yPos,
      head: [],
      body: generalInfoData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 80 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 20, right: 20 }
    });

    yPos = pdf.lastAutoTable.finalY + 10;

    // Item Details Section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Item Details / የእቃ ዝርዝር', 20, yPos);
    yPos += 2;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    const itemDetailsData = [
      ['Stock Number / የእቃ ቁጥር', this.item.stockNumber || 'Unknown'],
      ['Description / መግለጫ', this.item.description || 'Unknown'],
      ['Unit of Measurement / የመለኪያ አሃድ', this.item.unitOfMeasurment || 'Unknown'],
      ['On Hand / በእጅ ያለ', String(this.item.onHand || '0')],
      ['Request / ጥያቄ', String(this.item.request || '0')],
      ['Issued / የወጣ', String(this.item.issued || '0')],
      ['DO', this.item.do || '-'],
      ['Unit Price / የነጠላ ዋጋ', this.formatPrice(this.item.unitPrice, this.item.currency)],
      ['Total Price / ጠቅላላ ዋጋ', this.formatPrice(this.item.totalPrice, this.item.currency)],
      ['VAT', this.formatPrice(this.item.vat, this.item.currency)],
      ['Grand Total / ጠቅላላ ድምር', this.formatPrice(this.item.grandTotal, this.item.currency)],
      ['Currency / መገበያያ', this.item.currency || 'ETB']
    ];

    autoTable(pdf, {
      startY: yPos,
      head: [],
      body: itemDetailsData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 80 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 20, right: 20 }
    });

    yPos = pdf.lastAutoTable.finalY + 10;

    // Accessories Section
    if (this.item.hasAccessories && this.item.accessories && this.item.accessories.length > 0) {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Accessories / ተጨማሪ መሳሪያዎች', 20, yPos);
      yPos += 2;
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 5;

      const accessoriesData = this.item.accessories.map((acc: any) => [
        acc.name || 'Unknown',
        String(acc.quantity || 0)
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Name / ስም', 'Quantity / ብዛት']],
        body: accessoriesData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });

      yPos = pdf.lastAutoTable.finalY + 10;
    }

    // Extra Items Section
    if (this.item.hasExtraItems && this.item.extraItems && this.item.extraItems.length > 0) {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Extra Items / ተጨማሪ እቃዎች', 20, yPos);
      yPos += 2;
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 5;

      const extraItemsData = this.item.extraItems.map((extra: any) => [
        extra.name || 'Unknown',
        String(extra.quantity || 0),
        extra.store || 'Unknown',
        extra.extraStatus || 'Unknown',
        extra.extraIssuedByName || 'N/A'
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Name / ስም', 'Quantity / ብዛት', 'Store / ግምጃ ቤት', 'Status / ሁኔታ', 'Issued By / የወጣው በ']],
        body: extraItemsData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });

      yPos = pdf.lastAutoTable.finalY + 10;
    }

    // Approval Information Section
    if (yPos > 220) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Approval Information / የማረጋገጫ መረጃ', 20, yPos);
    yPos += 2;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;

    const approvalData = [
      ['Prepared By / ያዘጋጀው ስም', this.item.preparedBy || 'Unknown'],
      ['Prepared Rank / ያዘጋጀው ማዕረግ', this.item.pRank || 'Unknown'],
      ['Prepared Title / ያዘጋጀው ሃላፊነት', this.item.pTitle || 'Unknown'],
      ['Checked By / ያረጋገጠው ስም', this.item.checkedBy || 'Unknown'],
      ['Checked Rank / ያረጋገጠው ማዕረግ', this.item.cRank || 'Unknown'],
      ['Checked Title / ያረጋገጠው ሃላፊነት', this.item.cTitle || 'Unknown'],
      ['Approved By / ያጸደቀው ስም', this.item.approvedBy || 'Unknown'],
      ['Approved Rank / ያጸደቀው ማዕረግ', this.item.aRank || 'Unknown'],
      ['Approved Title / ያጸደቀው ሃላፊነት', this.item.aTitle || 'Unknown'],
      ['Issued By / የአረካካቢ ስም', this.item.issBy || 'Unknown'],
      ['Issued Rank / የአረካካቢ ማዕረግ', this.item.isRank || 'Unknown'],
      ['Issued Title / የአረካካቢ ሃላፊነት', this.item.isTitle || 'Unknown'],
      ['Issued/Turn By / ወጪ/ተመላሽ ያደረገው ስም', this.item.issuedTurnBy || 'Unknown'],
      ['Issued/Turn Rank / ወጪ/ተመላሽ ያደረገው ማዕረግ', this.item.iRank || 'Unknown'],
      ['Issued/Turn Title / ወጪ/ተመላሽ ያደረገው ሃላፊነት', this.item.iTitle || 'Unknown'],
      ['Received By / የተረከበው/የመለሰው ስም', this.item.receivedBy || 'Unknown'],
      ['Received Rank / የተረከበው/የመለሰው ማዕረግ', this.item.rRank || 'Unknown'],
      ['Received Title / የተረከበው/የመለሰው ሃላፊነት', this.item.rTitle || 'Unknown']
    ];

    autoTable(pdf, {
      startY: yPos,
      head: [['Signature Field / የፊርማ መስክ', 'Details / ዝርዝር']],
      body: approvalData,
      theme: 'grid',
      headStyles: { fillColor: [0, 32, 60] },
      styles: { fontSize: 9 }
    });

    const fileName = `Model2_Detail_${this.item.voucherNo || 'Record'}.pdf`;
    pdf.save(fileName);
  }

  printDetails() {
    window.print();
  }
}