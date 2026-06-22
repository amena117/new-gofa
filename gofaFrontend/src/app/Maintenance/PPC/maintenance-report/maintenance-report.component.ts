import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service'; // Adjust the path as needed

interface MaintenanceRequestRegister {
  worksOrderNumber: string;
  serialNoOfEquip?: string;
  briefDescriptionOfWork?: string;
  status?: string;
  maintenanceType?: string;
  dateWorkOrderReceived: string;
  maintainedBy: string;
  [key: string]: any; // Allow extra fields to prevent deserialization issues
}

interface GroupedReport {
  period: string;
  requests: MaintenanceRequestRegister[];
  
}

@Component({
  selector: 'app-maintenance-report',
  templateUrl: './maintenance-report.component.html',
  styleUrls: ['./maintenance-report.component.css']
})
export class MaintenanceReportComponent implements OnInit {
  reportData: GroupedReport[] = [];
  reportSummary: { [maintenanceType: string]: any } = {};
  isLoading: boolean = false;
  errorMessage: string = '';
   maintenanceTypeOptions: string[] = [];
  reportFilters = {
    startDate: '',
    endDate: '',
    interval: '',
    maintenanceType: ''
  };

  currentUserRole: string = '';
  private readonly FILTER_KEY = 'maintenanceReportFilters';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    console.log('ngOnInit: Initializing component');
    this.loadFiltersFromLocalStorage();
    console.log('ngOnInit: Filters after loading from localStorage:', this.reportFilters);
    this.currentUserRole = this.getUserRole();
    console.log('ngOnInit: Initial user role:', this.currentUserRole);
    this.setMaintenanceTypeOptions();
  }


  setMaintenanceTypeOptions(): void {
  switch (this.currentUserRole) {
    case 'POWER':
    case 'PTEAM_LEADER':
    case 'POWER_MAINTENANCE':
    case 'ELECTRICAL_MAINTENANCE':
    case 'MECHANICAL_MAINTENANCE':
    case 'WELDING_MAINTENANCE':
      this.maintenanceTypeOptions = ['POWER'];
      this.reportFilters.maintenanceType = 'POWER';
      break;

    case 'OFFICE_MACHINE':
    case 'OTEAM_LEADER':
      this.maintenanceTypeOptions = ['Office_machine'];
      this.reportFilters.maintenanceType = 'Office_machine';
      break;

    case 'RADIO_MAINTENANCE':
    case 'RTEAM_LEADER':
      this.maintenanceTypeOptions = ['RADIO_MAINTENANCE']; // as per your instruction
      this.reportFilters.maintenanceType = 'RADIO_MAINTENANCE';
      break;

    case 'MAINTENANCE_LEADER':
    case 'PPC':
      this.maintenanceTypeOptions = ['POWER', 'OFFICE MACHINE', 'RADIO_MAINTENANCE', 'VHF RADIO'];
      this.reportFilters.maintenanceType = '';
      break;

    default:
      this.maintenanceTypeOptions = ['POWER', 'OFFICE MACHINE', 'RADIO_MAINTENANCE', 'VHF RADIO'];
      this.reportFilters.maintenanceType = '';
      break;
  }

  console.log('setMaintenanceTypeOptions: Options for user role', this.currentUserRole, ':', this.maintenanceTypeOptions);
}

  loadFiltersFromLocalStorage(): void {
    console.log('loadFiltersFromLocalStorage: Checking localStorage for saved filters');
    const savedFilters = localStorage.getItem(this.FILTER_KEY);
    if (savedFilters) {
      this.reportFilters = JSON.parse(savedFilters);
      console.log('loadFiltersFromLocalStorage: Loaded filters:', this.reportFilters);
    } else {
      console.log('loadFiltersFromLocalStorage: No saved filters found');
    }
  }

  saveFiltersToLocalStorage(): void {
    console.log('saveFiltersToLocalStorage: Saving filters:', this.reportFilters);
    localStorage.setItem(this.FILTER_KEY, JSON.stringify(this.reportFilters));
  }

  getUserRole(): string {
    const role = this.authService.getRole();
    const normalizedRole = role ? role.trim().toUpperCase() : 'PPC'; // Default to PPC if null
    console.log('getUserRole: Retrieved role from AuthService:', normalizedRole);
    return normalizedRole;
  }

  // Format dates to MM/dd/yyyy to match C# backend, avoiding timezone issues
  formatDate(date: string): string {
    console.log('formatDate: Input date:', date);
    if (!date) {
      console.log('formatDate: No date provided, returning empty string');
      return '';
    }
    // Split the date string (expected format: YYYY-MM-DD)
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      console.log('formatDate: Invalid date format, returning empty string');
      return '';
    }
    // Format as MM/dd/yyyy
    const formatted = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    console.log('formatDate: Formatted date:', formatted);
    return formatted;
  }

generateReport(): void {
  console.log('generateReport: Starting report generation');
  console.log('generateReport: Current filters:', this.reportFilters);
  this.saveFiltersToLocalStorage();
  this.currentUserRole = this.getUserRole();

  const { startDate, endDate, interval, maintenanceType } = this.reportFilters;

  if (!startDate || !endDate) {
    this.errorMessage = 'እባክዎ የመጀመሪያውንና የመጨረሻውን ቀን ይምረጡ።';
    console.log('generateReport: Missing startDate or endDate, setting error:', this.errorMessage);
    return;
  }

  const formattedStartDate = this.formatDate(startDate);
  const formattedEndDate = this.formatDate(endDate);

  if (!formattedStartDate || !formattedEndDate) {
    this.errorMessage = 'ቀነሰ ቀን በተሳሳት ቅጽታ ነው። እባክዎ ትክክለኛ ቀን ይምረጡ።';
    console.log('generateReport: Invalid date format, setting error:', this.errorMessage);
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';
  console.log('generateReport: isLoading set to true, errorMessage cleared');

  // Build HTTP params
  let params = new HttpParams()
    .set('startDate', formattedStartDate)
    .set('endDate', formattedEndDate);

  if (interval) params = params.set('interval', interval);
  if (maintenanceType) params = params.set('maintenanceType', maintenanceType); // <-- NEW
  if (this.currentUserRole) params = params.set('role', this.currentUserRole);

  console.log('generateReport: Request params:', params.toString());

  const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/report`;
  console.log('generateReport: Request URL:', url);

  this.http.get<GroupedReport[]>(url, { params }).subscribe({
    next: (data) => {
      console.log('generateReport: Received response data:', data);

      // Optional: filter frontend if backend does not support maintenanceType
      if (maintenanceType) {
        data.forEach(group => {
          group.requests = group.requests.filter(
            req => req.maintenanceType === maintenanceType
          );
        });
        data = data.filter(group => group.requests.length > 0);
      }

      this.reportData = data;
      console.log('generateReport: reportData after assignment:', this.reportData);
      this.calculateSummary(data);
      this.isLoading = false;
      console.log('generateReport: isLoading set to false');
    },
    error: (err) => {
      console.error('generateReport: Error generating report:', err);
      this.errorMessage = err.status === 404
        ? 'ምንም ውጤት አልተገኘም።'
        : 'ሪፖርቱ ለማዘጋጀት አልተቻለም።';
      console.log('generateReport: Error message set:', this.errorMessage);
      this.isLoading = false;
      console.log('generateReport: isLoading set to false due to error');
    }
  });
}


  calculateSummary(data: GroupedReport[]): void {
    console.log('calculateSummary: Processing data:', data);
    const normalizeStatus = (status?: string): string => {
      const normalized = status ? status.trim().toLowerCase() : 'null';
      console.log('calculateSummary: Normalized status:', status, '->', normalized);
      return normalized;
    };
    const normalizeType = (type?: string): string => {
      const normalized = type ? type.trim().toLowerCase() : 'unknown';
      console.log('calculateSummary: Normalized type:', type, '->', normalized);
      return normalized;
    };

    const groupedSummary: { [maintenanceType: string]: any } = {};

    data.forEach((group, index) => {
      console.log(`calculateSummary: Processing group ${index}:`, group);
      group.requests.forEach((request, reqIndex) => {
        console.log(`calculateSummary: Processing request ${reqIndex} in group ${index}:`, request);
        const type = normalizeType(request.maintenanceType);
        const status = normalizeStatus(request.status);

        if (!groupedSummary[type]) {
          groupedSummary[type] = { total: 0 };
          console.log('calculateSummary: Initialized summary for type:', type);
        }

        groupedSummary[type].total += 1;
        groupedSummary[type][status] = (groupedSummary[type][status] || 0) + 1;
        console.log('calculateSummary: Updated summary for type:', type, groupedSummary[type]);
      });
    });

    this.reportSummary = groupedSummary;
    console.log('calculateSummary: Final reportSummary:', this.reportSummary);
  }

  getMaintenanceTypes(): string[] {
    const types = Object.keys(this.reportSummary);
    console.log('getMaintenanceTypes: Returning types:', types);
    return types;
  }

  getStatusesForType(type: string): string[] {
    const statuses = Object.keys(this.reportSummary[type]).filter(key => key !== 'total');
    console.log(`getStatusesForType: Returning statuses for type ${type}:`, statuses);
    return statuses;
  }

  formatDateForDisplay(dateString: string): string {
    console.log('formatDateForDisplay: Input date:', dateString);
    if (!dateString) {
      console.log('formatDateForDisplay: No date provided, returning N/A');
      return 'N/A';
    }
    const date = new Date(dateString);
    const formatted = isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
    console.log('formatDateForDisplay: Formatted date:', formatted);
    return formatted;
  }

  printReport(): void {
    console.log('printReport: Triggering window.print');
    window.print();
  }
}