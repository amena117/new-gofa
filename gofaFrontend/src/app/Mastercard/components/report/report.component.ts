import { Component, OnInit } from '@angular/core';
import { MasterCardService } from '../../../services/mastercard.service';
import { MasterCardItemsReportFilter, MasterCardItemReport, MasterCardItemsReportResponse } from '../../models/mastercard.model';
import { Organization, Location } from '../../../services/mastercard.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {
    filter: MasterCardItemsReportFilter = { includeAccessories: false };
    reportItems: MasterCardItemReport[] = [];
    reportSummary: any = {};
    displayedColumns: string[] = ['model', 'partNumber', 'totalReceived', 'totalIssued', 'inStock', 'details'];
    organizations: Organization[] = [];
    locations: Location[] = [];
    models: string[] = [];
    partNumbers: string[] = [];
    selectedPeriod: string = '';

    constructor(private masterCardService: MasterCardService) {}

    ngOnInit(): void {
        this.loadDropdownOptions();
        this.loadReport();
    }

    loadDropdownOptions(): void {
        this.masterCardService.getOrganizations().subscribe({
            next: (orgs) => this.organizations = orgs,
            error: (err) => console.error('Error loading organizations:', err)
        });
        this.masterCardService.getLocations().subscribe({
            next: (locs) => this.locations = locs,
            error: (err) => console.error('Error loading locations:', err)
        });
        this.masterCardService.getModels().subscribe({
            next: (models) => this.models = models,
            error: (err) => console.error('Error loading models:', err)
        });
        this.masterCardService.getPartNumbers().subscribe({
            next: (partNumbers) => this.partNumbers = partNumbers,
            error: (err) => console.error('Error loading part numbers:', err)
        });
    }

    loadReport(): void {
        this.masterCardService.getReport(this.filter).subscribe({
            next: (data: MasterCardItemsReportResponse) => {
                this.reportItems = data.items.map(item => ({
                    ...item,
                    showDetails: false
                }));
                this.reportSummary = data.summary;
            },
            error: (err) => {
                console.error('Error loading report:', err);
                this.reportItems = [];
                this.reportSummary = {};
            }
        });
    }

    exportToExcel(): void {
        if (!this.reportItems || this.reportItems.length === 0) {
            return;
        }

        try {
            const workbook = XLSX.utils.book_new();

            // 1. Overview Sheet
            const overviewData = this.reportItems.map((item, index) => ({
                'No / ተራ ቁጥር': index + 1,
                'Card No / የመዝገብ ቁጥር': item.item.cardNo || '-',
                'Model / ሞዴል': item.item.model || '-',
                'Part Number / የእቃው መለያ ቁጥር': item.item.partNumber || '-',
                'Description / መግለጫ': item.item.description || '-',
                'Unit / መለኪያ': item.item.unitOfMeasure || '-',
                'Total Received / አጠቃላይ ገቢ': item.totals.totalReceived || 0,
                'Total Issued / አጠቃላይ ወጪ': item.totals.totalIssued || 0,
                'In Stock / በመጋዘን ውስጥ': item.totals.inStock || 0,
                'Status / ሁኔታ': item.item.status || '-'
            }));

            const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
            overviewSheet['!cols'] = [
                { wch: 6 }, { wch: 15 }, { wch: 20 }, { wch: 22 },
                { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
                { wch: 18 }, { wch: 15 }
            ];
            XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Inventory Overview');

            // 2. Received Records Sheet
            const receivedRows: any[] = [];
            this.reportItems.forEach(item => {
                if (item.receivedRecords && item.receivedRecords.length > 0) {
                    item.receivedRecords.forEach(rec => {
                        let accessoriesStr = '-';
                        if (rec.receivedAccessories && rec.receivedAccessories.length > 0) {
                            accessoriesStr = rec.receivedAccessories
                                .map(a => `${a.name} (${a.quantity})`)
                                .join(', ');
                        }
                        receivedRows.push({
                            'Model / ሞዴል': item.item.model || '-',
                            'Part Number / የእቃው መለያ ቁጥር': item.item.partNumber || '-',
                            'Transaction Date / የግብይት ቀን': rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString() : (rec.date ? new Date(rec.date).toLocaleDateString() : '-'),
                            'Registration Date / የመዝገብ ቀን': rec.date ? new Date(rec.date).toLocaleDateString() : '-',
                            'Voucher No / የቮውቸር ቁጥር': rec.voucherNo || '-',
                            'Received Qty / ገቢ ብዛት': rec.received || 0,
                            'Organization / ድርጅት': rec.organization || '-',
                            'Location / ቦታ': rec.location || '-',
                            'Posted By / መዝጋቢ': rec.postedBy || '-',
                            'Accessories / ተያያዥ እቃዎች': accessoriesStr
                        });
                    });
                }
            });

            if (receivedRows.length > 0) {
                const receivedSheet = XLSX.utils.json_to_sheet(receivedRows);
                receivedSheet['!cols'] = [
                    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
                    { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 35 }
                ];
                XLSX.utils.book_append_sheet(workbook, receivedSheet, 'Received Records');
            }

            // 3. Issued Records Sheet
            const issuedRows: any[] = [];
            this.reportItems.forEach(item => {
                if (item.issuedRecords && item.issuedRecords.length > 0) {
                    item.issuedRecords.forEach(iss => {
                        let accessoriesStr = '-';
                        if (iss.issuedAccessories && iss.issuedAccessories.length > 0) {
                            accessoriesStr = iss.issuedAccessories
                                .map(a => `${a.name} (${a.quantity})`)
                                .join(', ');
                        }
                        issuedRows.push({
                            'Model / ሞዴል': item.item.model || '-',
                            'Part Number / የእቃው መለያ ቁጥር': item.item.partNumber || '-',
                            'Transaction Date / የግብይት ቀን': iss.transactionDate ? new Date(iss.transactionDate).toLocaleDateString() : (iss.date ? new Date(iss.date).toLocaleDateString() : '-'),
                            'Registration Date / የመዝገብ ቀን': iss.date ? new Date(iss.date).toLocaleDateString() : '-',
                            'Voucher No / የቮውቸር ቁጥር': iss.voucherNo || '-',
                            'Issued Qty / ወጪ ብዛት': iss.issued || 0,
                            'Organization / ድርጅት': iss.organization || '-',
                            'Location / ቦታ': iss.location || '-',
                            'Posted By / መዝጋቢ': iss.postedBy || '-',
                            'Accessories / ተያያዥ እቃዎች': accessoriesStr
                        });
                    });
                }
            });

            if (issuedRows.length > 0) {
                const issuedSheet = XLSX.utils.json_to_sheet(issuedRows);
                issuedSheet['!cols'] = [
                    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
                    { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 35 }
                ];
                XLSX.utils.book_append_sheet(workbook, issuedSheet, 'Issued Records');
            }

            // 4. Summary Sheet
            const summaryData = [
                ['Inventory Report Summary / የእቃ መዝገብ ሪፖርት ማጠቃለያ'],
                ['Generated Date / የተፈጠረበት ቀን', new Date().toLocaleString()],
                ['Total Items / አጠቃላይ እቃዎች', this.reportSummary?.totalItems || this.reportItems.length],
                ['Total Received / አጠቃላይ ገቢ', this.reportSummary?.totalReceived || 0],
                ['Total Issued / አጠቃላይ ወጪ', this.reportSummary?.totalIssued || 0],
                ['Total In Stock / አጠቃላይ በመጋዘን', this.reportSummary?.totalInStock || 0],
                [''],
                ['Filter Criteria / የማጣሪያ መመዘኛዎች'],
                ['Time Period / የጊዜ ገደብ', this.selectedPeriod ? `${this.selectedPeriod} Month(s)` : 'All Time'],
                ['Start Date / መነሻ ቀን', this.filter.startDate || 'All'],
                ['End Date / መጨረሻ ቀን', this.filter.endDate || 'All'],
                ['Organization / ድርጅት', this.filter.organization || 'All'],
                ['Location / ቦታ', this.filter.location || 'All'],
                ['Model / ሞዴል', this.filter.model || 'All'],
                ['Part Number / መለያ ቁጥር', this.filter.partNumber || 'All'],
                ['Include Accessories / አክሰሰሪ ጨምር', this.filter.includeAccessories ? 'Yes' : 'No']
            ];

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            summarySheet['!cols'] = [{ wch: 35 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Save file
            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `MasterCard_Inventory_Report_${dateStr}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
        }
    }

    exportToCSV(): void {
        if (!this.reportItems || this.reportItems.length === 0) {
            return;
        }

        const headers = [
            'Model / ሞዴል',
            'Part Number / የእቃው መለያ ቁጥር',
            'Description / መግለጫ',
            'Total Received / አጠቃላይ ገቢ',
            'Total Issued / አጠቃላይ ወጪ',
            'In Stock / በመጋዘን ውስጥ'
        ];

        const rows = this.reportItems.map(item => [
            `"${item.item.model || ''}"`,
            `"${item.item.partNumber || ''}"`,
            `"${item.item.description || ''}"`,
            item.totals.totalReceived || 0,
            item.totals.totalIssued || 0,
            item.totals.inStock || 0
        ]);

        let csvContent = '\uFEFF' + headers.join(',') + '\n';
        csvContent += rows.map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    onPeriodChange(): void {
        if (!this.selectedPeriod) {
            this.filter.startDate = '';
            this.filter.endDate = '';
            return;
        }

        const months = parseInt(this.selectedPeriod, 10);
        if (!isNaN(months)) {
            const today = new Date();
            const startDate = new Date();
            startDate.setMonth(today.getMonth() - months);

            this.filter.endDate = today.toISOString().split('T')[0];
            this.filter.startDate = startDate.toISOString().split('T')[0];
        }
    }

    applyFilter(): void {
        console.log('Filter values:', this.filter);
        this.loadReport();
    }

    resetFilter(): void {
        this.selectedPeriod = '';
        this.filter = { includeAccessories: false };
        this.loadReport();
    }

    toggleDetails(row: MasterCardItemReport): void {
        row.showDetails = !row.showDetails;
    }
}