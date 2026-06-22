import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance-finished-for-client',
  templateUrl: './maintenance-finished-for-client.component.html',
  styleUrls: ['./maintenance-finished-for-client.component.css']
})
export class MaintenanceFinishedForClientComponent implements OnInit {
  maintenanceRequests: any[] = [];
  filteredRequests: any[] = [];
  paginatedRequests: any[] = [];
  isLoading = true;
  errorMessage = '';

  // Search & Filter
  searchTerm = '';
  searchType = 'worksOrderNumber';
  selectedMaintenanceType = '';
  selectedStatus = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;

  // Delivery Form
  showDeliveryForm = false;
  isFormLoading = false;
  formErrorMessage = '';
  deliveryFormData: any = {};

  userRole = '';
  maintenanceTypes = ['POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO'];
  // Only show finished/delivered statuses — not all statuses
  statuses = ['Maintenance Finished', 'Client Received'];

  searchTypes = [
    { value: 'worksOrderNumber', label: 'Works Order No' },
    { value: 'serialNoOfEquip', label: 'Serial No' },
    { value: 'nomenclature', label: 'Nomenclature' },
    { value: 'requestedBy', label: 'Requested By' },
  ];

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    const role = this.authService.getRole()?.trim();
    this.userRole = role ? role.toUpperCase() : '';
    this.fetchMaintenanceRequests();
  }

  fetchMaintenanceRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Fetch all requests and filter in frontend for better visibility across stages
    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;

    this.http.get<any[]>(url).subscribe(
      (data) => {
        if (this.userRole === 'QUALITY') {
          // Quality ONLY sees VHF and HF radios that are waiting for check OR finished
          this.maintenanceRequests = data.filter(req => {
            const isStatusMatch = ['Quality Check', 'Maintenance Finished'].includes(req.status);
            const stage = (req.statusStage || '').toUpperCase();
            const type = (req.maintenanceType || '').toUpperCase();
            const reqTo = (req.requestedTo || '').toLowerCase();
            const isRadioMatch = stage.includes('RADIO') || type.includes('RADIO') || reqTo.includes('vhf') || reqTo.includes('hf');
            
            return isStatusMatch && isRadioMatch;
          });
        } else if (this.userRole === 'PPC') {
          // PPC sees everything from quality check onwards
          this.maintenanceRequests = data.filter(req => 
            ['Quality Check', 'Maintenance Finished', 'Client Received', 'Do Out'].includes(req.status)
          );
        } else {
          this.maintenanceRequests = [];
        }
        
        this.filteredRequests = [...this.maintenanceRequests];
        this.currentPage = 1;
        this.applyPagination();
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'No maintenance items found.';
        this.isLoading = false;
      }
    );
  }

  applySearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredRequests = this.maintenanceRequests.filter(req => {
      const matchesSearch = !this.searchTerm.trim() ||
        String(req[this.searchType] ?? '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesType = !this.selectedMaintenanceType ||
        req.statusStage === this.selectedMaintenanceType;
      const matchesStatus = !this.selectedStatus ||
        req.status === this.selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
    this.applyPagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedMaintenanceType = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.filteredRequests = [...this.maintenanceRequests];
    this.applyPagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize);
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyPagination();
    }
  }

  previousPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  giveForClients(request: any): void {
    this.deliveryFormData = {
      worksOrderNumber: request.worksOrderNumber,
      serialNoOfEquip: request.serialNoOfEquip,
      givenTo: '',
      approval: '',
      recieverRemark: '',
      recievedDate: new Date().toISOString().split('T')[0]
    };
    this.showDeliveryForm = true;
    this.formErrorMessage = '';
  }

  qualify(request: any): void {
    if (!request?.worksOrderNumber) return;
    if (!confirm(`Qualify Works Order: ${request.worksOrderNumber}?`)) return;

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/qualify/${request.worksOrderNumber}`;
    this.http.put(url, {}, { responseType: 'text' }).subscribe(
      () => {
        alert(`Works Order ${request.worksOrderNumber} qualified successfully.`);
        this.fetchMaintenanceRequests();
      },
      () => alert('Failed to qualify the maintenance request.')
    );
  }

  submitDeliveryForm(): void {
    if (!this.deliveryFormData.givenTo || !this.deliveryFormData.approval || !this.deliveryFormData.recievedDate) {
      this.formErrorMessage = 'Please fill all required fields.';
      return;
    }

    this.isFormLoading = true;
    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/deliver/${this.deliveryFormData.worksOrderNumber}`;
    const body = {
      GivenTo: this.deliveryFormData.givenTo,
      Approval: this.deliveryFormData.approval,
      RecieverRemark: this.deliveryFormData.recieverRemark,
      RecievedDate: this.deliveryFormData.recievedDate
    };

    this.http.put(url, body, { responseType: 'text' }).subscribe(
      () => {
        this.isFormLoading = false;
        this.showDeliveryForm = false;
        this.formErrorMessage = '';
        alert('Delivered successfully.');
        this.fetchMaintenanceRequests();
      },
      () => {
        this.isFormLoading = false;
        this.formErrorMessage = 'Failed to deliver maintenance request.';
      }
    );
  }

  cancelDeliveryForm(): void {
    this.showDeliveryForm = false;
    this.deliveryFormData = {};
    this.formErrorMessage = '';
  }
}
