import { Component, OnInit } from '@angular/core';
import { MasterCardService } from '../../../services/mastercard.service';
import { MasterCardItemsReportFilter, MasterCardItemReport, MasterCardItemsReportResponse } from '../../models/mastercard.model';
import { Organization, Location } from '../../../services/mastercard.service';

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
    // statuses: string[] = [];

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
        // this.masterCardService.getStatuses().subscribe({
        //     next: (statuses) => this.statuses = statuses,
        //     error: (err) => console.error('Error loading statuses:', err)
        // });
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

    exportToCSV(): void {
  if (!this.reportItems || this.reportItems.length === 0) {
    return;
  }

  // Define CSV headers (bilingual)
  const headers = [
    'Model / ሞዴል',
    'Part Number / የእቃው መለያ ቁጥር',
    'Total Received / አጠቃላይ ገቢ',
    'Total Issued / አጠቃላይ ወጪ',
    'In Stock / በመጋዘን ውስጥ'
  ];

  // Map report items to CSV rows
  const rows = this.reportItems.map(item => [
    `"${item.item.model}"`,
    `"${item.item.partNumber}"`,
    item.totals.totalReceived,
    item.totals.totalIssued,
    item.totals.inStock
  ]);

  // Build CSV content
  let csvContent = headers.join(',') + '\n';
  csvContent += rows.map(row => row.join(',')).join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

    applyFilter(): void {
        console.log('Filter values:', this.filter);
        this.loadReport();
    }

    resetFilter(): void {
        this.filter = { includeAccessories: false };
        this.loadReport();
    }

    toggleDetails(row: MasterCardItemReport): void {
        row.showDetails = !row.showDetails;
    }
}