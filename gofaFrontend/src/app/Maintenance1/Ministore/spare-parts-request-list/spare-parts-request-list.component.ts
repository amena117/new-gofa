import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface ResponseData {
  quantityApproved: number | null;
  approvedBy: string;
  remark: string;
  serialNumber: string;
}

@Component({
  selector: 'app-spare-parts-request-list',
  templateUrl: './spare-parts-request-list.component.html',
  styleUrls: ['./spare-parts-request-list.component.css']
})
export class SparePartsRequestListComponent implements OnInit {
  sparePartsRequests: any[] = [];
  selectedRequest: any = null;
  availableSerialNumbers: string[] = [];
  allSpareParts: any[] = [];

  response: ResponseData = {
    quantityApproved: null,
    approvedBy: '',
    remark: '',
    serialNumber: ''
  };

  isLoading = true;
  errorMessage = '';
  userRole: string = '';

  // ✅ Base API URL from environment
  private readonly apiBase = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.fetchSparePartsRequests();
  }

  /**
   * Load and validate user role via AuthService
   */
  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();

    if (!role) {
      console.warn('User role not found. Session may have expired.');
      alert('Session expired or role not found. Please log in again.');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.userRole = role.toUpperCase(); // Normalize to uppercase
  }

  /**
   * Fetch spare parts requests filtered by user role
   */
  fetchSparePartsRequests(): void {
    const url = `${this.apiBase}/api/SparePartsRequest/all`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Raw API Response:', data);

        // Normalize property casing (camelCase or PascalCase)
        const normalizedData = data.map(item => ({
          ...item,
          requestedBy: item.requestedBy ?? item.RequestedBy,
          currentStage: item.currentStage ?? item.CurrentStage,
          id: item.id ?? item.Id,
          stockNumber: item.stockNumber ?? item.StockNumber,
          quantityAsked: item.quantityAsked ?? item.QuantityAsked,
          worksOrderNumber: item.worksOrderNumber ?? item.WorksOrderNumber
        }));

        const filteredRequests = normalizedData.filter(req => {
          switch (this.userRole) {
            case 'PTEAM_LEADER':
              return req.requestedBy === 'POWER' && req.currentStage === 'PTEAM_LEADER';
            case 'OTEAM_LEADER':
              return req.requestedBy === 'OFFICE_MACHINE' && req.currentStage === 'OTEAM_LEADER';
            case 'VTEAM_LEADER':
              return req.requestedBy === 'VHF_RADIO' && req.currentStage === 'VTEAM_LEADER';
            case 'HTEAM_LEADER':
              return req.requestedBy === 'HF_RADIO' && req.currentStage === 'HTEAM_LEADER';
            case 'RTEAM_LEADER':
              return req.requestedBy === 'HEAVY_MACHINE' && req.currentStage === 'RTEAM_LEADER';
            case 'MAINTENANCE_LEADER':
              return (
                ['PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER']
                  .includes(req.requestedBy) &&
                req.currentStage === 'MAINTENANCE_LEADER'
              );
            case 'MINISTORE':
              return req.currentStage === 'MINISTORE';
            default:
              return false;
          }
        });

        this.sparePartsRequests = filteredRequests.map(req => ({
          ...req,
          isResponded: !!req.approvalDate || req.currentStage === 'COMPLETED'
        }));

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching spare parts requests:', error);
        this.errorMessage = 'Failed to load spare parts requests.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Reject a request (delete it)
   */
  rejectRequest(id: number): void {
    if (!confirm('Are you sure you want to reject this request?')) return;

    const url = `${this.apiBase}/api/SparePartsRequest/${id}`;
    this.http.delete(url).subscribe({
      next: () => {
        alert('Request rejected successfully.');
        this.sparePartsRequests = this.sparePartsRequests.filter(req => req.id !== id);
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        alert('Failed to reject the request.');
      }
    });
  }

  /**
   * Navigate to receive spare form
   */
  acceptRequest(id: number, stockNumber: string): void {
    this.router.navigate(['/maintenance/receive-spare-form-12'], {
      queryParams: { id, stockNumber }
    }).catch(err => {
      console.error('Navigation failed:', err);
    });
  }

  /**
   * Open response form for MINISTORE
   */
  openRespondForm(request: any): void {
    this.selectedRequest = { ...request };
    this.response = {
      quantityApproved: null,
      approvedBy: '',
      remark: '',
      serialNumber: ''
    };
    this.fetchAvailableSerialNumbers(request.stockNumber);
  }

  /**
   * Fetch available serial numbers for a stock number
   */
  fetchAvailableSerialNumbers(stockNumber: string): void {
    const url = `${this.apiBase}/api/MiniStoreBinCard/serials?stockNumber=${stockNumber}&status=Available in stock`;
    this.http.get<string[]>(url).subscribe({
      next: (data) => {
        this.availableSerialNumbers = data;
      },
      error: (err) => {
        console.error('Error fetching serial numbers:', err);
        this.availableSerialNumbers = [];
      }
    });
  }

  /**
   * Submit response (approve + assign serial)
   */
  submitResponse(): void {
    const userRole = this.authService.getRole()?.trim();
    if (!userRole) {
      alert('Session expired. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.response.quantityApproved || !this.response.serialNumber) {
      alert('Please fill in all required fields: Quantity Approved and Serial Number.');
      return;
    }

    if (this.response.quantityApproved > this.selectedRequest.quantityAsked) {
      alert('Quantity Approved cannot exceed Quantity Asked.');
      return;
    }

    // ✅ Update SparePartsRequest
    const updatedRequest = {
      id: this.selectedRequest.id,
      worksOrderNumber: this.selectedRequest.worksOrderNumber,
      stockNumber: this.selectedRequest.stockNumber,
      quantityApproved: this.response.quantityApproved,
      approvedBy: userRole,
      approvalDate: new Date().toISOString(),
      remark: this.response.remark,
      serialNumber: this.response.serialNumber
    };

    const updateUrl = `${this.apiBase}/api/SparePartsRequest/${this.selectedRequest.id}`;
    this.http.put(updateUrl, updatedRequest).subscribe({
      next: () => {
        // ✅ Mark serial as given
        const giveSpareDto = {
          stockNumber: Number(this.selectedRequest.stockNumber),
          serialNumbers: [this.response.serialNumber],
          givenTo: this.selectedRequest.requestedBy,
          dateGiven: new Date()
        };

        const giveSpareUrl = `${this.apiBase}/api/MiniStoreBinCard/give-spare`;
        this.http.put(giveSpareUrl, giveSpareDto).subscribe({
          next: () => {
            // ✅ Update stage to COMPLETED
            const stageUpdateDto = {
              RequestedBy: userRole,
              CurrentStage: 'COMPLETED'
            };

            const stageUpdateUrl = `${this.apiBase}/api/SparePartsRequest/${this.selectedRequest.id}/update-requested-by`;
            this.http.patch(stageUpdateUrl, stageUpdateDto).subscribe({
              next: () => {
                alert('✅ Response submitted, serial marked as Given, and request marked as COMPLETED.');

                this.sparePartsRequests = this.sparePartsRequests.map(req =>
                  req.id === this.selectedRequest.id
                    ? { ...req, ...updatedRequest, isResponded: true, currentStage: 'COMPLETED' }
                    : req
                );

                this.cancelResponse();
              },
              error: (err) => {
                console.error('Error updating stage to COMPLETED:', err);
                alert('Failed to mark request as COMPLETED.');
              }
            });
          },
          error: (err) => {
            console.error('Error updating serial number status:', err);
            alert('Failed to update serial number status. Please try again.');
          }
        });
      },
      error: (err) => {
        console.error('Error updating SparePartsRequest:', err);
        alert('Failed to submit the request update.');
      }
    });
  }

  /**
   * Cancel response form
   */
  cancelResponse(): void {
    this.selectedRequest = null;
    this.response = {
      quantityApproved: null,
      approvedBy: '',
      remark: '',
      serialNumber: ''
    };
    this.availableSerialNumbers = [];
  }

  /**
   * Approve request (move to next stage)
   */
  approveRequest(request: any): void {
    const userRole = this.authService.getRole()?.trim();
    if (!userRole) {
      alert('User role not found. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    const stageMap: Record<string, string> = {
      'PTEAM_LEADER': 'MAINTENANCE_LEADER',
      'OTEAM_LEADER': 'MAINTENANCE_LEADER',
      'RTEAM_LEADER': 'MAINTENANCE_LEADER',
      'HTEAM_LEADER': 'MAINTENANCE_LEADER',
      'VTEAM_LEADER': 'MAINTENANCE_LEADER',
      'MAINTENANCE_LEADER': 'MINISTORE',
      'MINISTORE': 'COMPLETED'
    };

    const nextStage = stageMap[userRole];
    if (!nextStage) {
      alert(`No approval path configured for role: ${userRole}`);
      return;
    }

    const updatedDto = {
      RequestedBy: userRole,
      CurrentStage: nextStage
    };

    const validStages = [
      'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER',
      'MAINTENANCE_LEADER', 'MINISTORE', 'COMPLETED'
    ];

    if (!validStages.includes(updatedDto.CurrentStage)) {
      alert('Invalid CurrentStage value.');
      return;
    }

    const url = `${this.apiBase}/api/SparePartsRequest/${request.id}/update-requested-by`;
    this.http.patch(url, updatedDto).subscribe({
      next: () => {
        alert(`Request approved by ${userRole} and moved to ${nextStage}.`);
        this.sparePartsRequests = this.sparePartsRequests.map(req =>
          req.id === request.id ? { ...req, ...updatedDto } : req
        );
      },
      error: (err) => {
        console.error('Error approving request:', err);
        alert('Failed to approve the request.');
      }
    });
  }

  /**
   * Check if user is MINISTORE
   */
  isMinistore(): boolean {
    return this.userRole === 'MINISTORE';
  }

  /**
   * Check if user is a Team Leader (not MAINTENANCE_LEADER)
   */
  isTeamLeader(): boolean {
    return ['PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER'].includes(this.userRole);
  }

  /**
   * Navigate to reject form
   */
  goToRejectForm(worksOrderNumber: number): void {
    this.router.navigate(['/maintenance/reject-request'], {
      queryParams: { worksOrderNumber }
    }).catch(err => console.error('Navigation failed:', err));
  }
}