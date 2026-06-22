import { Component, OnInit } from '@angular/core';
import { MaintenanceRequestService } from '../../../services/maintenance-request.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-handover-confirmation',
  templateUrl: './handover-confirmation.component.html',
  styleUrls: ['./handover-confirmation.component.css']
})
export class HandoverConfirmationComponent implements OnInit {
  pendingHandovers: any[] = [];
  confirmedHandovers: any[] = [];
  isLoading = true;
  userFullName = '';

  constructor(
    private maintenanceService: MaintenanceRequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const firstName = this.authService.getFirstName() || '';
    const lastName = this.authService.getLastName() || '';
    this.userFullName = `${firstName} ${lastName}`.trim();
    this.loadHandovers();
  }

  loadHandovers(): void {
    this.isLoading = true;
    this.maintenanceService.getHandoverLogsByTechnician(this.userFullName).subscribe({
      next: (data) => {
        this.pendingHandovers = data.filter(h => !h.isConfirmedByTechnician);
        this.confirmedHandovers = data.filter(h => h.isConfirmedByTechnician);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading handovers:', err);
        this.isLoading = false;
      }
    });
  }

  confirmHandover(id: number): void {
    if (!confirm('Are you sure you want to confirm receipt of this spare part?')) return;

    this.maintenanceService.confirmHandover(id).subscribe({
      next: () => {
        alert('✅ Handover confirmed successfully.');
        this.loadHandovers();
        this.maintenanceService.triggerNotificationsRefresh();
      },
      error: (err) => {
        alert('❌ Failed to confirm handover: ' + (err?.error?.message || err?.message));
      }
    });
  }

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
    .header { text-align: center; margin-bottom: 18px; border-bottom: 3px double #000; padding-bottom: 12px; }
    .header .org   { font-size: 13pt; font-weight: bold; line-height: 1.6; }
    .header .title { font-size: 16pt; font-weight: bold; margin-top: 8px; letter-spacing: 0.5px; }
    .header .sub   { font-size: 11pt; margin-top: 2px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11pt; }
    .meta-row span { font-weight: bold; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    table.info td { padding: 7px 10px; font-size: 11.5pt; vertical-align: top; }
    table.info tr { border-bottom: 1px solid #ccc; }
    table.info tr:first-child { border-top: 2px solid #000; }
    table.info tr:last-child  { border-bottom: 2px solid #000; }
    table.info .label { font-weight: bold; width: 38%; }
    .remark-box { border: 1px solid #aaa; border-radius: 4px; padding: 8px 12px;
                  min-height: 48px; font-size: 11pt; margin-bottom: 24px; }
    .sig-section { margin-top: 30px; }
    .sig-section h3 { font-size: 12pt; font-weight: bold; margin-bottom: 18px;
                      border-bottom: 1px solid #888; padding-bottom: 6px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-block .role { font-size: 10pt; color: #333; margin-bottom: 40px; }
    .sig-block .line { border-bottom: 1.5px solid #000; margin-bottom: 5px; }
    .sig-block .name { font-size: 10pt; color: #555; }
    .sig-block .date-line { margin-top: 12px; font-size: 10pt; }
    .stamp { text-align: center; margin-top: 28px; }
    .stamp-box { display: inline-block; border: 2.5px solid #c2410c; color: #c2410c;
                 padding: 6px 24px; border-radius: 6px; font-size: 13pt;
                 font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
    .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #666;
              border-top: 1px solid #ccc; padding-top: 8px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">
      በኢፌዲሪ መከላከያ ሚኒስቴር <br>
      በመገናኛና እንፎርሜሽን ዋና መምሪያ
    </div>
    <div class="title">Spare Part Handover Slip / ስፔርፓርት የርክክብ ደረሰኝ</div>
    <div class="sub">Issue Spare Part Form / ስፔርፓርት የመስጫ ፎርም</div>
  </div>
  <div class="meta-row">
    <div>Slip No. / ደረሰኝ ቁጥር: <span>#${log.id}</span></div>
    <div>Date Issued / ቀን: <span>${issueDate}</span></div>
  </div>
  <table class="info">
    <tr><td class="label">Stock Number / ስቶክ ቁጥር</td><td>${log.stockNumber || '—'}</td></tr>
    <tr><td class="label">Description / መግለጫ</td><td>${log.description || '—'}</td></tr>
    <tr><td class="label">Serial Number / ሲሪያል ቁጥር</td><td>${log.serialNumber || '—'}</td></tr>
    <tr><td class="label">Technician (Receiver) / ተቀባዩ</td><td><strong>${log.technicianName || '—'}</strong></td></tr>
    <tr><td class="label">Works Order No. / የሥራ ትዕዛዝ ቁጥር</td><td>${log.worksOrderNumber || '—'}</td></tr>
    <tr><td class="label">Issued By / ያወጣው</td><td>${log.issuedBy || '—'}</td></tr>
  </table>
  <div style="margin-bottom:6px; font-weight:bold; font-size:11pt;">Remark / ማስታወሻ:</div>
  <div class="remark-box">${log.remark || ''}</div>
  <div class="sig-section">
    <h3>Signatures / ፊርማዎች</h3>
    <div class="sig-grid">
      <div class="sig-block">
        <div class="role">Issued By / ያወጣው (Ministore)</div>
        <div class="line"></div>
        <div class="name">Name / ስም: ${log.issuedBy || '___________________'}</div>
        <div class="date-line">Date / ቀን:<div class="line"></div></div>
      </div>
      <div class="sig-block">
        <div class="role">Received By / ተቀባዩ (Technician)</div>
        <div class="line"></div>
        <div class="name">Name / ስም: ${log.technicianName || '___________________'}</div>
        <div class="date-line">Date / ቀን:<div class="line"></div></div>
      </div>
    </div>
  </div>
  <div class="stamp"><div class="stamp-box">Pending Signature / ፊርማ ይጠበቃል</div></div>
  <div class="footer">Printed on ${new Date().toLocaleString('en-GB')}</div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }
}
