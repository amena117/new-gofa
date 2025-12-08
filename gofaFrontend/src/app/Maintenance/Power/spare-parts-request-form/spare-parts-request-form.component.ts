import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface SparePart {
  stockNumber: string;
  description: string;
}

interface SparePartForm {
  stockNumber: string;
  quantityAsked: number;
  reason: string;
}

@Component({
  selector: 'app-spare-parts-request-form',
  templateUrl: './spare-parts-request-form.component.html',
  styleUrls: ['./spare-parts-request-form.component.css'],
})
export class SparePartsRequestFormComponent implements OnInit {
  formData: any = {
    worksOrderNumber: 0,
    serialNoOfEquip: '',
    model: '',
    requestedBy: '',
    requestType: '',
    spareParts: [] as SparePartForm[]
  };

  spareParts: SparePart[] = [];

  private readonly ROLE_CONFIG: Record<string, { currentStage: string; requestType: string }> = {
    power: { currentStage: 'PTEAM_LEADER', requestType: 'POWER' },
    office_machine: { currentStage: 'OTEAM_LEADER', requestType: 'OFFICE_MACHINE' },
    radio_maintenance: { currentStage: 'RTEAM_LEADER', requestType: 'RADIO_MAINTENANCE' },
    hf_radio: { currentStage: 'HTEAM_LEADER', requestType: 'HF_RADIO' },
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUserRole();
    this.loadWorksOrderNumber();
    this.loadSpareParts();
    this.addPart(); // Initialize with one row
  }

  private loadUserRole(): void {
    const role = this.authService.getRole()?.trim();
    if (!role) {
      alert('Session expired or role not found. Please log in again.');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    const normalizedRole = role.toLowerCase();
    if (!this.ROLE_CONFIG[normalizedRole]) {
      alert(`Your role (${role}) is not authorized to submit spare part requests.`);
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.formData.requestedBy = role.toUpperCase();
    this.formData.requestType = this.ROLE_CONFIG[normalizedRole].requestType;
  }

  private loadWorksOrderNumber(): void {
    this.route.queryParams.subscribe((params) => {
      const woNumber = params['worksOrderNumber'];
      if (woNumber) {
        this.formData.worksOrderNumber = Number(woNumber);
        this.loadSerialAndModel(this.formData.worksOrderNumber);
      }
    });
  }

  private loadSerialAndModel(worksOrderNumber: number): void {
    this.http.get<any>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-worksorder/${worksOrderNumber}`)
      .subscribe({
        next: (data) => {
          this.formData.serialNoOfEquip = data.serialNoOfEquip || '';
          this.formData.model = data.model || '';
        },
        error: (err) => {
          alert('Could not load serial number and model for this works order.');
          console.error('Error fetching serial/model:', err);
        }
      });
  }

  private updateMaintenanceRequest(): Promise<void> {
    const payload = {
      SerialNoOfEquip: this.formData.serialNoOfEquip,
      Model: this.formData.model,
      Status: "On Maintenance"
    };
    return this.http.put<void>(
      `${environment.apiBaseUrl}/api/MaintenanceRequestRegister/by-worksorder/${this.formData.worksOrderNumber}/update-serial-model`,
      payload
    ).toPromise();
  }

  private loadSpareParts(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MiniStoreBinCard/parts`).subscribe({
      next: (data) => {
        this.spareParts = data.map((item) => ({
          stockNumber: item.stockNumber,
          description: item.description
        }));
      },
      error: (error) => {
        alert('Failed to load spare parts. Please try again later.');
        console.error('Error fetching spare parts:', error);
      }
    });
  }

  addPart(): void {
    this.formData.spareParts.push({
      stockNumber: '',
      quantityAsked: 1,
      reason: ''
    });
  }

  removePart(index: number): void {
    this.formData.spareParts.splice(index, 1);
  }

async submitRequest(): Promise<void> {
  try {
    // First update maintenance request
    await this.updateMaintenanceRequest();

    const userRoleKey = this.formData.requestedBy.toLowerCase();
    const config = this.ROLE_CONFIG[userRoleKey];

    // Ensure every object is a fresh literal and does not have Id
    const payload = this.formData.spareParts
  .filter((p: SparePartForm) => p.stockNumber && p.quantityAsked > 0 && p.reason)
  .map((part: SparePartForm) => ({
    Id: 0, // let EF Core auto-generate
    WorksOrderNumber: this.formData.worksOrderNumber,
    SerialNoOfEquip: this.formData.serialNoOfEquip,
    Model: this.formData.model,
    RequestedBy: this.formData.requestedBy,
    StockNumber: part.stockNumber,
    QuantityAsked: part.quantityAsked,
    Reason: part.reason,
    RequestType: this.formData.requestType,
    CurrentStage: config.currentStage,
    
  }));



    if (!payload.length) {
      alert('Please add at least one spare part with a valid stock number.');
      return;
    }

    await this.http.post(
      `${environment.apiBaseUrl}/api/SparePartsRequest/bulk`,
      payload
    ).toPromise();

    alert('Spare parts request submitted successfully.');
    this.resetForm();

  } catch (err) {
    alert('Failed to submit spare parts request.');
    console.error('Error submitting spare parts request:', err);
  }
}


  private resetForm(): void {
    this.formData.spareParts = [];
    this.addPart(); // reset with one empty row
  }
}
