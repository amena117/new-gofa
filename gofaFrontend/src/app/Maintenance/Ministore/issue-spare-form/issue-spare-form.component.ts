import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-issue-spare-form',
  templateUrl: './issue-spare-form.component.html',
  styleUrls: ['./issue-spare-form.component.css']
})
export class IssueSpareFormComponent implements OnInit {

  // Spare parts inventory (shared for search across all items)
  allParts: any[] = [];
  isLoadingParts = true;
  technicians: any[] = [];
  isLoadingTechnicians = false;

  // Work Orders for searchable dropdown
  workOrders: any[] = [];
  filteredWorkOrders: any[] = [];
  workOrderSearchQuery = '';
  isLoadingWorkOrders = false;
  isWoDropdownOpen = false;

  // Form fields - Common for all items
  technicianName = '';
  technicianUsername = ''; // New field to store the username/ID
  worksOrderNumber = '';
  issueDate = '';

  // Multiple items array
  items: Array<{
    stockNumber: string;
    description: string;
    serialNumber: string;
    quantity: number;
    remark: string;
    searchQuery: string;
    filteredParts: any[];
  }> = [];

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  // Listing
  logs: any[] = [];
  filteredLogs: any[] = [];
  isLoadingLogs = true;
  listSearchQuery = '';
  dateFilter = 'all'; // Default to show all

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Detail modal
  selectedLog: any = null;

  private readonly apiBase = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.issueDate = new Date().toISOString().split('T')[0];
    this.loadAllParts();
    this.loadTechnicians();
    this.loadWorkOrders();
    this.loadLogs();
    this.addItem(); // Add first item by default
  }

  // ── Work Order search ──────────────────────────────────────────────

  loadWorkOrders(): void {
    console.log('Loading work orders from:', `${this.apiBase}/api/MaintenanceRequestRegister/active-work-orders`);
    this.isLoadingWorkOrders = true;
    this.http.get<any[]>(`${this.apiBase}/api/MaintenanceRequestRegister/active-work-orders`).subscribe({
      next: (data) => {
        console.log('Work orders loaded successfully:', data.length, 'items');
        this.workOrders = data;
        this.isLoadingWorkOrders = false;
      },
      error: (err) => {
        console.error('Failed to load work orders:', err);
        this.isLoadingWorkOrders = false;
      }
    });
  }

  filterWorkOrders(): void {
    // kept for backwards compat — delegates to the new handler
    this.onWoSearchInput();
  }

  clearWorkOrder(): void {
    this.worksOrderNumber = '';
    this.workOrderSearchQuery = '';
    this.filteredWorkOrders = [];
    this.isWoDropdownOpen = false;
  }

  onWoSearchInput(): void {
    const q = (this.workOrderSearchQuery || '').toLowerCase().trim();
    if (!q) {
      this.filteredWorkOrders = this.workOrders.slice(0, 20);
    } else {
      this.filteredWorkOrders = this.workOrders.filter(wo =>
        (wo.worksOrderNumber && wo.worksOrderNumber.toLowerCase().includes(q)) ||
        (wo.nomenclature     && wo.nomenclature.toLowerCase().includes(q)) ||
        (wo.serialNumber     && wo.serialNumber.toLowerCase().includes(q)) ||
        (wo.model            && wo.model.toLowerCase().includes(q))
      );
    }
    this.isWoDropdownOpen = true;
  }

  onWoFocus(): void {
    const q = (this.workOrderSearchQuery || '').toLowerCase().trim();
    this.filteredWorkOrders = q
      ? this.filteredWorkOrders
      : this.workOrders.slice(0, 20);
    this.isWoDropdownOpen = true;
  }

  onWoBlur(): void {
    // Small delay so mousedown on list item fires before blur hides the list
    setTimeout(() => { this.isWoDropdownOpen = false; }, 200);
  }

  selectWorkOrder(wo: any): void {
    this.worksOrderNumber = wo.worksOrderNumber;
    // Show the selected WO number in the input so the user can see it
    this.workOrderSearchQuery = `WO# ${wo.worksOrderNumber} — ${wo.nomenclature || ''}`.trim();
    this.filteredWorkOrders = [];
    this.isWoDropdownOpen = false;
  }

  // ── Technician dropdown ───────────────────────────────────────────

  loadTechnicians(): void {
    this.isLoadingTechnicians = true;
    this.http.get<any[]>(`${this.apiBase}/api/Auth/technicians`).subscribe({
      next: (data) => {
        this.technicians = data;
        this.isLoadingTechnicians = false;
      },
      error: (err) => {
        console.error('Failed to load technicians:', err);
        this.isLoadingTechnicians = false;
      }
    });
  }

  // ── Spare part search ──────────────────────────────────────────────

  loadAllParts(): void {
    this.isLoadingParts = true;
    this.http.get<any[]>(`${this.apiBase}/api/MiniStoreBinCard`).subscribe({
      next: (data) => {
        this.allParts = data;
        this.isLoadingParts = false;
      },
      error: (err) => {
        console.error('Failed to load inventory:', err);
        this.errorMessage = 'Could not load spare parts inventory. Check API connection.';
        this.isLoadingParts = false;
      }
    });
  }

  filterParts(index: number): void {
    const item = this.items[index];
    const q = (item.searchQuery || '').toLowerCase().trim();
    if (!q) {
      item.filteredParts = [];
      return;
    }
    item.filteredParts = this.allParts.filter(p =>
      (p.stockNumber   && p.stockNumber.toLowerCase().includes(q)) ||
      (p.description   && p.description.toLowerCase().includes(q)) ||
      (p.category      && p.category.toLowerCase().includes(q)) ||
      (p.model         && p.model.toLowerCase().includes(q))
    );
  }

  selectPart(part: any, index: number): void {
    const item = this.items[index];
    item.stockNumber = part.stockNumber;
    item.description = part.description;
    item.searchQuery = '';
    item.filteredParts = [];
  }

  clearPart(index: number): void {
    const item = this.items[index];
    item.stockNumber = '';
    item.description = '';
  }

  // ── Multiple Items Management ──────────────────────────────────────

  addItem(): void {
    this.items.push({
      stockNumber: '',
      description: '',
      serialNumber: '',
      quantity: 1,
      remark: '',
      searchQuery: '',
      filteredParts: []
    });
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    } else {
      alert('At least one item must remain in the form.');
    }
  }

  onTechnicianChange(): void {
    const tech = this.technicians.find(t => t.username === this.technicianUsername);
    if (tech) {
      this.technicianName = tech.fullName;
    } else {
      this.technicianName = '';
    }
  }

  // ── Form submit ────────────────────────────────────────────────────

  submitHandover(): void {
    if (this.isSubmitting) return;

    // Validate common fields
    if (!this.technicianUsername.trim()) { 
      alert('Please select a technician.'); 
      return; 
    }
    if (!this.issueDate) { 
      alert('Please select the issue date.'); 
      return; 
    }

    // Validate items
    if (this.items.length === 0) {
      alert('Please add at least one item.');
      return;
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item.stockNumber.trim()) {
        alert(`Item ${i + 1}: Please enter or search a stock number.`);
        return;
      }
      if (!item.serialNumber.trim()) {
        alert(`Item ${i + 1}: Please enter the serial number.`);
        return;
      }
      if (!item.quantity || item.quantity < 1) {
        alert(`Item ${i + 1}: Quantity must be at least 1.`);
        return;
      }
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      items: this.items.map(item => ({
        stockNumber: item.stockNumber.trim(),
        description: item.description.trim(),
        serialNumber: item.serialNumber.trim(),
        quantity: item.quantity,
        remark: item.remark.trim() || null
      })),
      technicianName: this.technicianName.trim(),
      worksOrderNumber: this.worksOrderNumber.trim() || null,
      issuedBy: this.authService.getUsername() || this.authService.getRole() || 'MINISTORE',
      issueDate: new Date(this.issueDate).toISOString()
    };

    this.http.post(`${this.apiBase}/api/SparePartHandoverLog/batch`, payload).subscribe({
      next: (response: any) => {
        this.successMessage = `✅ ${response.count} item(s) handed over to ${this.technicianName}. Print the slip and have the technician sign it manually.`;
        this.resetForm();
        this.loadLogs();
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to record handover.';
        this.isSubmitting = false;
      }
    });
  }

  private resetForm(): void {
    this.items = [];
    this.addItem(); // Add one empty item
    this.technicianName = '';
    this.technicianUsername = '';
    this.worksOrderNumber = '';
    this.workOrderSearchQuery = '';
    this.filteredWorkOrders = [];
    this.isWoDropdownOpen = false;
    this.issueDate = new Date().toISOString().split('T')[0];
  }

  // ── Listing ────────────────────────────────────────────────────────

  loadLogs(): void {
    this.isLoadingLogs = true;
    this.http.get<any[]>(`${this.apiBase}/api/SparePartHandoverLog`).subscribe({
      next: (data) => {
        this.logs = data;
        this.applyListFilter();
        this.isLoadingLogs = false;
      },
      error: () => { this.isLoadingLogs = false; }
    });
  }

  applyListFilter(): void {
    const q = (this.listSearchQuery || '').toLowerCase().trim();
    
    // Date filter logic
    const now = new Date();
    let startDate: Date | null = null;
    
    if (this.dateFilter === '1w') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (this.dateFilter === '1m') {
      startDate = new Date();
      startDate.setMonth(now.getMonth() - 1);
    } else if (this.dateFilter === '3m') {
      startDate = new Date();
      startDate.setMonth(now.getMonth() - 3);
    } else if (this.dateFilter === '6m') {
      startDate = new Date();
      startDate.setMonth(now.getMonth() - 6);
    } else if (this.dateFilter === '12m') {
      startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
    }

    this.filteredLogs = this.logs.filter(l => {
      // Text filter
      const matchesSearch = !q || (
        (l.stockNumber    && l.stockNumber.toLowerCase().includes(q)) ||
        (l.serialNumber   && l.serialNumber.toLowerCase().includes(q)) ||
        (l.technicianName && l.technicianName.toLowerCase().includes(q)) ||
        (l.worksOrderNumber && String(l.worksOrderNumber).toLowerCase().includes(q)) ||
        (l.issuedBy       && l.issuedBy.toLowerCase().includes(q))
      );

      // Date filter
      let matchesDate = true;
      if (startDate) {
        const logDate = new Date(l.issueDate || l.createdAt);
        matchesDate = logDate >= startDate;
      }

      return matchesSearch && matchesDate;
    });
    
    this.currentPage = 1;
  }

  get pagedLogs(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize);
  }

  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  // ── Detail modal ───────────────────────────────────────────────────

  openDetail(log: any): void  { this.selectedLog = log; }
  closeDetail(): void         { this.selectedLog = null; }

  // ── Print slip ─────────────────────────────────────────────────────

  printSlip(log: any): void {
    const issueDate = log.issueDate
      ? new Date(log.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { alert('Please allow pop-ups to print.'); return; }

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="UTF-8" />
  <title>Spare Part Handover Slip</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }

    /* Header */
    .header { text-align: center; margin-bottom: 18px; border-bottom: 3px double #000; padding-bottom: 12px; }
    .header .org   { font-size: 13pt; font-weight: bold; line-height: 1.6; }
    .header .title { font-size: 16pt; font-weight: bold; margin-top: 8px; letter-spacing: 0.5px; }
    .header .sub   { font-size: 11pt; margin-top: 2px; }

    /* Slip number + date row */
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11pt; }
    .meta-row span { font-weight: bold; }

    /* Info table */
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    table.info td { padding: 7px 10px; font-size: 11.5pt; vertical-align: top; }
    table.info tr { border-bottom: 1px solid #ccc; }
    table.info tr:first-child { border-top: 2px solid #000; }
    table.info tr:last-child  { border-bottom: 2px solid #000; }
    table.info .label { font-weight: bold; width: 38%; color: #000; }
    table.info .value { color: #000; }

    /* Remark box */
    .remark-box { border: 1px solid #aaa; border-radius: 4px; padding: 8px 12px;
                  min-height: 48px; font-size: 11pt; margin-bottom: 24px; }

    /* Signature section */
    .sig-section { margin-top: 30px; }
    .sig-section h3 { font-size: 12pt; font-weight: bold; margin-bottom: 18px;
                      border-bottom: 1px solid #888; padding-bottom: 6px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-block { display: flex; flex-direction: column; gap: 4px; }
    .sig-block .role { font-size: 10pt; color: #333; margin-bottom: 40px; }
    .sig-block .line { border-bottom: 1.5px solid #000; margin-bottom: 5px; }
    .sig-block .name { font-size: 10pt; color: #555; }
    .sig-block .date-line { margin-top: 12px; font-size: 10pt; }
    .sig-block .date-line .line { margin-bottom: 5px; }

    /* Status stamp */
    .stamp { text-align: center; margin-top: 28px; }
    .stamp-box {
      display: inline-block;
      border: 2.5px solid ${log.isConfirmedByTechnician ? '#15803d' : '#c2410c'};
      color: ${log.isConfirmedByTechnician ? '#15803d' : '#c2410c'};
      padding: 6px 24px;
      border-radius: 6px;
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* Footer */
    .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #666;
              border-top: 1px solid #ccc; padding-top: 8px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- ── Header ── -->
  <div class="header">
    <div class="org">
      በኢፌዲሪ መከላከያ ሚኒስቴር <br>
      በመገናኛና እንፎርሜሽን ዋና መምሪያ
    </div>
    <div class="title">Spare Part Handover Slip / ስፔርፓርት የርክክብ ደረሰኝ</div>
    <div class="sub">Issue Spare Part Form / ስፔርፓርት የመስጫ ፎርም</div>
  </div>

  <!-- ── Meta ── -->
  <div class="meta-row">
    <div>Slip No. / ደረሰኝ ቁጥር: <span>#${log.id}</span></div>
    <div>Date Issued / ቀን: <span>${issueDate}</span></div>
  </div>

  <!-- ── Details table ── -->
  <table class="info">
    <tr>
      <td class="label">Stock Number / ስቶክ ቁጥር</td>
      <td class="value">${log.stockNumber || '—'}</td>
    </tr>
    <tr>
      <td class="label">Description / መግለጫ</td>
      <td class="value">${log.description || '—'}</td>
    </tr>
    <tr>
      <td class="label">Serial Number / ሲሪያል ቁጥር</td>
      <td class="value">${log.serialNumber || '—'}</td>
    </tr>
    <tr>
      <td class="label">Quantity / ብዛት</td>
      <td class="value">${log.quantity ?? 1}</td>
    </tr>
    <tr>
      <td class="label">Technician (Receiver) / ተቀባዩ</td>
      <td class="value"><strong>${log.technicianName || '—'}</strong></td>
    </tr>
    <tr>
      <td class="label">Works Order No. / የሥራ ትዕዛዝ ቁጥር</td>
      <td class="value">${log.worksOrderNumber || '—'}</td>
    </tr>
    <tr>
      <td class="label">Issued By / ያወጣው</td>
      <td class="value">${log.issuedBy || '—'}</td>
    </tr>
  </table>

  <!-- ── Remark ── -->
  <div style="margin-bottom:6px; font-weight:bold; font-size:11pt;">
    Remark / ማስታወሻ:
  </div>
  <div class="remark-box">${log.remark || ''}</div>

  <!-- ── Signatures ── -->
  <div class="sig-section">
    <h3>Signatures / ፊርማዎች</h3>
    <div class="sig-grid">

      <div class="sig-block">
        <div class="role">Issued By / ያወጣው (Ministore)</div>
        <div class="line"></div>
        <div class="name">Name / ስም: ${log.issuedBy || '___________________'}</div>
        <div class="date-line">
          Date / ቀን:
          <div class="line"></div>
        </div>
      </div>

      <div class="sig-block">
        <div class="role">Received By / ተቀባዩ (Technician)</div>
        <div class="line"></div>
        <div class="name">Name / ስም: ${log.technicianName || '___________________'}</div>
        <div class="date-line">
          Date / ቀን:
          <div class="line"></div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Footer ── -->
  <div class="footer">
    Printed on ${new Date().toLocaleString('en-GB')} &nbsp;|&nbsp;
    የተሰራው ቀን: ${new Date().toLocaleString('en-GB')}
  </div>

</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    // Small delay so fonts/layout render before print dialog
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }
}
