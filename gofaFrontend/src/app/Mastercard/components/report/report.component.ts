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