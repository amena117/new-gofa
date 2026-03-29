import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Model22Service } from '../../services/model22.service';
import { Model22Dto, Model22ItemAccessory } from '../../model/model22';
import { AuthService } from '../../services/auth.service';
import { UserInfo } from '../../model/user.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-model22-detail',
  templateUrl: './model22-detail.component.html',
  styleUrls: ['./model22-detail.component.css']
})
export class Model22DetailComponent implements OnInit {
  model22: Model22Dto | null = null;
  errorMessage: string | null = null;
  private _userRole: string | null = null;

  get userRole(): string | null {
    return this._userRole;
  }

  set userRole(value: string | null) {
    this._userRole = value;
  }

  constructor(
    private route: ActivatedRoute,
    private model22Service: Model22Service,
    private authService: AuthService,
    private location: Location
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const roleFilter = this.route.snapshot.queryParamMap.get('role') || undefined;

    const rawRole = roleFilter || this.authService.getRole();
    this.userRole = rawRole ? rawRole.toLowerCase().replace(/_/g, '').trim() : null;

    if (!this.userRole) {
      this.errorMessage = 'የለም ወይም ልክ ያልሆነ ሚና። እባክዎ አስተዳዳሪውን ያነጋግሩ።';
      this.location.back();
      return;
    }

    if (isNaN(id)) {
      this.errorMessage = 'ልክ ያልሆነ ሞዴል 22 መለያ።';
      return;
    }

    this.loadModel22WithRegisteredByFullName(id, roleFilter);
  }

  private loadModel22WithRegisteredByFullName(id: number, role: string | undefined): void {
    this.model22Service.getModel22(id, role).subscribe({
      next: (model22: Model22Dto) => {
        this.model22 = { ...model22 };

        if (this.model22.registeredBy === 'anonymous' || !this.model22.registeredBy) {
          this.setRegisteredByFromCurrentUser();
        } else {
          this.fetchUserInfoByUsername(this.model22.registeredBy);
        }
      },
      error: (err: any) => {
        console.error('Error fetching Model22:', err);
        this.errorMessage = 'ሞዴል 22 ዝርዝሮችን መጫን አልተሳካም፡ ' + (err.message || 'Unknown error');
        setTimeout(() => this.location.back(), 3000);
      }
    });
  }

  private setRegisteredByFromCurrentUser(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!this.model22) return;

    if (currentUser) {
      const fullName = [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(' ');
      this.model22.registeredByFullName = fullName.trim() || currentUser.username || 'Unknown';
    } else {
      this.model22.registeredByFullName = this.model22.registeredBy || 'Unknown / የማይታወቅ';
    }
  }

  private fetchUserInfoByUsername(username: string): void {
    if (!username || username === 'anonymous') {
      this.setRegisteredByFromCurrentUser();
      return;
    }

    this.authService.getUserByUsername(username).subscribe({
      next: (userInfo: UserInfo | null) => {
        if (!this.model22) return;
        if (userInfo) {
          const fullName = [userInfo.firstName, userInfo.lastName]
            .filter(Boolean)
            .join(' ');
          this.model22.registeredByFullName = fullName || userInfo.username || username;
        } else {
          this.setRegisteredByFromCurrentUser();
        }
      },
      error: () => {
        this.setRegisteredByFromCurrentUser();
      }
    });
  }

  // Safe helper methods
  getItemAccessories(item: any): Model22ItemAccessory[] {
    return item.withdrawnAccessories || [];
  }

  itemHasAccessories(item: any): boolean {
    return this.getItemAccessories(item).length > 0;
  }

  hasAccessories(): boolean {
    return this.model22?.items?.some(item => this.itemHasAccessories(item)) || false;
  }

  getItemAccessoriesTotal(item: any): string {
    const accessories = this.getItemAccessories(item);
    const total = accessories.reduce((sum, acc) => sum + (acc.unitPrice || 0) * (acc.quantity || 0), 0);
    return `${total.toFixed(2)} ${item.currency || 'ETB'}`;
  }

  private getItemAccessoriesTotalValue(item: any): number {
    return this.getItemAccessories(item).reduce((sum, acc) => sum + (acc.unitPrice || 0) * (acc.quantity || 0), 0);
  }

  getAllAccessoriesTotal(): string {
    if (!this.model22?.items) return '0.00 ETB';
    
    // Group totals by currency
    const totalsByCurrency = new Map<string, number>();
    
    this.model22.items.forEach(item => {
      const accTotal = this.getItemAccessoriesTotalValue(item);
      const currency = item.currency || 'ETB';
      
      const currentTotal = totalsByCurrency.get(currency) || 0;
      totalsByCurrency.set(currency, currentTotal + accTotal);
    });
    
    // Format as "10,000.00 ETB + 2,000.00 USD"
    const parts: string[] = [];
    totalsByCurrency.forEach((value, currency) => {
      if (value > 0) {
        parts.push(`${value.toFixed(2)} ${currency}`);
      }
    });
    
    return parts.length > 0 ? parts.join(' + ') : '0.00 ETB';
  }

  getItemTotalWithAccessories(item: any): string {
    // If this is an accessory-only withdrawal, item total should be 0
    if (item.isAccessoryOnly) {
      return `0.00 ${item.currency || 'ETB'}`;
    }
    const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
    return `${itemTotal.toFixed(2)} ${item.currency || 'ETB'}`;
  }

  // Group accessories by parent item
  getAccessoriesGroupedByParent(): any[] {
    if (!this.model22?.items) return [];

    const groups: any[] = [];
    
    this.model22.items.forEach(item => {
      const accessories = this.getItemAccessories(item);
      if (accessories.length > 0) {
        const consolidatedAccessories = this.consolidateAccessories(accessories);
        groups.push({
          parentDescription: item.description,
          parentModel: item.model,
          parentCurrency: item.currency,
          accessories: consolidatedAccessories
        });
      }
    });
    
    return groups;
  }

  // Consolidate duplicate accessories by name and model
  private consolidateAccessories(accessories: Model22ItemAccessory[]): Model22ItemAccessory[] {
    const accessoryMap = new Map<string, Model22ItemAccessory>();
    
    accessories.forEach(acc => {
      const key = `${acc.name}_${acc.model}`;
      
      if (accessoryMap.has(key)) {
        const existing = accessoryMap.get(key)!;
        existing.quantity += acc.quantity;
        // Merge serial numbers if they exist
        if (acc.withdrawnSerialNumbers && acc.withdrawnSerialNumbers.length > 0) {
          if (!existing.withdrawnSerialNumbers) {
            existing.withdrawnSerialNumbers = [];
          }
          existing.withdrawnSerialNumbers.push(...acc.withdrawnSerialNumbers);
        }
      } else {
        accessoryMap.set(key, { ...acc });
      }
    });
    
    return Array.from(accessoryMap.values());
  }

  getGrandTotalWithAccessories(): string {
    if (!this.model22?.items) return '0.00 ETB';

    // Group totals by currency
    const totalsByCurrency = new Map<string, number>();

    this.model22.items.forEach(item => {
      // If accessory-only, don't include item price, only accessories
      const itemTotal = item.isAccessoryOnly ? 0 : ((item.unitPrice || 0) * (item.quantity || 0));
      const accTotal = this.getItemAccessoriesTotalValue(item);
      const total = itemTotal + accTotal;
      const currency = item.currency || 'ETB';

      const currentTotal = totalsByCurrency.get(currency) || 0;
      totalsByCurrency.set(currency, currentTotal + total);
    });

    // Format as "10,000.00 ETB + 2,000.00 USD"
    const parts: string[] = [];
    totalsByCurrency.forEach((value, currency) => {
      parts.push(`${value.toFixed(2)} ${currency}`);
    });

    return parts.join(' + ');
  }

  goBack(): void {
    this.location.back();
  }

  async downloadPDF(): Promise<void> {
    try {
      const element = document.querySelector('.model22-detail') as HTMLElement;
      if (!element) throw new Error('Element not found');

      const prepareForCapture = () => {
        document.querySelectorAll('.sidebar, .sidebar-toggle, .sidebar-backdrop, .form-actions, .loading-state, .message.error-message')
          .forEach(el => (el as HTMLElement).style.display = 'none');

        document.body.classList.add('print-mode');

        // Capture at 1200px to ensure tables have horizontal space
        element.style.width = '1200px';
        element.style.padding = '40px';
        element.style.background = '#ffffff';
        element.style.boxShadow = 'none';

        window.scrollTo(0, 0);
      };

      const restoreAfterCapture = () => {
        document.querySelectorAll('.sidebar, .sidebar-toggle, .sidebar-backdrop, .form-actions, .loading-state, .message.error-message')
          .forEach(el => (el as HTMLElement).style.display = '');

        document.body.classList.remove('print-mode');

        element.style.width = '';
        element.style.padding = '';
        element.style.background = '';
        element.style.boxShadow = '';
      };

      prepareForCapture();

      // Delay to allow styles to settle
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Scaling 1200px capture down to fit 210mm A4 width
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Multi-page handling
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const filename = `Model22_Report_${this.model22?.model22Id || ''}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      restoreAfterCapture();

    } catch (err) {
      console.error('PDF Error:', err);
      this.errorMessage = 'ፒዲኤፍ ማመንጨት አልተሳካም።';
      document.body.classList.remove('print-mode');
    }
  }
}