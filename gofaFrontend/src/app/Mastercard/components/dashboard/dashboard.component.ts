import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { MasterCardService, DashboardStats, TopIssuedItem, MonthlyTrend } from '../../../services/mastercard.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class MasterCardDashboardComponent implements OnInit {
  stats: DashboardStats = {
    registeredItems: 0,
    totalReceived: 0,
    totalIssued: 0,
    totalInStock: 0,
    requestOrdersCount: 0,
    totalRequestedIssued: 0
  };
  topItems: TopIssuedItem[] = [];
  monthlyTrends: MonthlyTrend[] = [];
  barChart: Chart | undefined;
  lineChart: Chart | undefined;

  constructor(private masterCardService: MasterCardService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadTopIssuedItems();
    this.loadMonthlyTrends();
  }

  loadStats(): void {
    this.masterCardService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.renderBarChart();
      },
      error: (error) => console.error('Error loading stats:', error)
    });
  }

  loadTopIssuedItems(): void {
    this.masterCardService.getTopIssuedItems(5).subscribe({
      next: (data) => {
        this.topItems = data;
      },
      error: (error) => console.error('Error loading top issued items:', error)
    });
  }

  loadMonthlyTrends(): void {
    this.masterCardService.getMonthlyTrends(12).subscribe({
      next: (data) => {
        this.monthlyTrends = data;
        this.renderLineChart();
      },
      error: (error) => console.error('Error loading monthly trends:', error)
    });
  }

  renderBarChart(): void {
    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    if (ctx) {
      this.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Registered', 'Received', 'Issued', 'In Stock', 'Request Orders', 'Requested Issued'],
          datasets: [{
            label: 'Inventory Stats',
            data: [
              this.stats.registeredItems,
              this.stats.totalReceived,
              this.stats.totalIssued,
              this.stats.totalInStock,
              this.stats.requestOrdersCount,
              this.stats.totalRequestedIssued
            ],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  renderLineChart(): void {
    const ctx = document.getElementById('lineChart') as HTMLCanvasElement;
    if (ctx) {
      this.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.monthlyTrends.map(t => t.month),
          datasets: [
            {
              label: 'Received',
              data: this.monthlyTrends.map(t => t.received),
              borderColor: '#36A2EB',
              fill: false
            },
            {
              label: 'Issued',
              data: this.monthlyTrends.map(t => t.issued),
              borderColor: '#FF6384',
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });      
    }    

  }
}