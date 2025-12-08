import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MaintenanceRegister {
  id?: number;
  fileNumber: string;
  requestRegister: string;
  nomenclature: string;
  model: number;
  serialNoOfEquip: string;
  chasisNumber: string;
  engineNumber: string;
  quantity: number;
  requestedBy: string;
  dayIn: string;
  typeofMaintenance: string;
  repairStartDate: string;
  repairFinishDate: string | null;
  maintainHors: number;
  worksOrderNumber: number;
}

@Injectable({
  providedIn: 'root',
})
export class MaintenanceService {
  private apiUrl = 'http://localhost:5131/api/MaintenanceRegister'; // Replace with your API URL

  constructor(private http: HttpClient) {}

  // Create a new Maintenance Register
  createMaintenanceRegister(data: MaintenanceRegister): Observable<MaintenanceRegister> {
    return this.http.post<MaintenanceRegister>(this.apiUrl, data);
  }

  // Get all Maintenance Registers
  getMaintenanceRegisters(): Observable<MaintenanceRegister[]> {
    return this.http.get<MaintenanceRegister[]>(this.apiUrl);
  }
}