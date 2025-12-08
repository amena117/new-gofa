import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SummaryItem {
  status?: string;
  count?: number;
  totalCost?: number;
  percentage?: number;
  stockNumber?: string;
  balance?: number;
  name?: string;
  totalSerials?: number;
  maintenanceType?: string;
  value?: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  summaryData: {
    maintenanceStatus: SummaryItem[];
    miniStoreSummary: SummaryItem[];
    sparePartsStatus: SummaryItem[];
    bincardsSummary: SummaryItem[];
  } = {
    maintenanceStatus: [],
    miniStoreSummary: [],
    sparePartsStatus: [],
    bincardsSummary: []
  };

  detailedInfo: any = null;
  serialDetails: any[] = [];

  isLoading = true;
  errorMessage = '';

  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDashboardSummary();
  }

  loadDashboardSummary(): void {
    this.http.get<any>(`${this.apiBaseUrl}/api/Dashboard/summary`).subscribe({
      next: (data) => {
        const totalMaintenance = data.maintenanceStatus.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
        const totalSpareParts = data.sparePartsStatus.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

        this.summaryData = {
          maintenanceStatus: data.maintenanceStatus.map((item: any) => ({
            maintenanceType: item.maintenanceType,
            status: item.status,
            count: item.count,
            totalCost: item.totalCost,
            percentage: totalMaintenance ? (item.count / totalMaintenance) * 100 : 0
          })) || [],
          miniStoreSummary: data.miniStoreSummary || [],
          sparePartsStatus: data.sparePartsStatus.map((item: any) => ({
            status: item.status,
            count: item.count,
            totalCost: item.totalCost,
            percentage: totalSpareParts ? (item.count / totalSpareParts) * 100 : 0
          })) || [],
          bincardsSummary: data.miniStoreSummary || [] // Adjust if bincards data is separate
        };

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard summary:', error);
        this.errorMessage = 'Failed to load dashboard summary.';
        this.isLoading = false;
      }
    });
  }

  onChartClick(clickedItem: any, chartType: string): void {
    this.detailedInfo = {
      name: clickedItem.name || clickedItem.status,
      value: clickedItem.count || clickedItem.balance || clickedItem.totalSerials || clickedItem.totalCost,
      chartType
    };

    if (chartType === 'bincards' && clickedItem.stockNumber) {
      this.http.get<any[]>(`${this.apiBaseUrl}/api/Dashboard/bincard/${clickedItem.stockNumber}`).subscribe({
        next: (data) => {
          this.serialDetails = data;
        },
        error: (error) => {
          console.error('Error fetching serials for', clickedItem.stockNumber, error);
          this.errorMessage = 'Failed to load serial details.';
        }
      });
    } else {
      this.serialDetails = [];
    }
  }
}
