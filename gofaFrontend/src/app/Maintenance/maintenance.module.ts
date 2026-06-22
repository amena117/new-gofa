import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaintenanceRoutingModule } from './maintenance-routing.module';

// Components
import { MaintenanceComponent } from './maintenance.component';
//import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestDetailsComponent } from './request-details/request-details.component';
import { EditRequestComponent } from './edit-request/edit-request.component';
import { MaintenanceRegisterListComponent } from './maintenance-register-list/maintenance-register-list.component';
import { SparePartsRequestListComponent } from './Ministore/spare-parts-request-list/spare-parts-request-list.component';
import { SparePartsRequestFormComponent } from './Power/spare-parts-request-form/spare-parts-request-form.component';
import { SparePartsRequestDetailsComponent } from './spare-parts-request-details/spare-parts-request-details.component';
import { SpecialToolsRegisterListComponent } from './special-tools-register-list/special-tools-register-list.component';
import { SpecialToolsRegisterFormComponent } from './special-tools-register-form/special-tools-register-form.component';
import { SpecialToolsRegisterDetailsComponent } from './special-tools-register-details/special-tools-register-details.component';
import { MaintenanceRequestRegisterComponent } from './PPC/maintenance-request-register/maintenance-request-register.component';
import { MaintenanceRequestRegisterListComponent } from './PPC/maintenance-request-register-list/maintenance-request-register-list.component';
import { AssignMaintenanceComponent } from './PPC/assign-maintenance/assign-maintenance.component';
import { ReassignMaintenanceComponent } from './PPC/reassign-maintenance/reassign-maintenance.component';
import { MaintenanceRequestListComponent } from './Power/maintenance-request-list/maintenance-request-list.component';
import { MaintenanceSparePartRequestFormComponent } from './maintenance-sparepart-request-form/maintenance-sparepart-request-form.component';
import { SparePartsRequestRespondComponent } from './Ministore/spare-parts-request-respond/spare-parts-request-respond.component';
import { MiniStoreBinCardComponent } from './Ministore/mini-store-bin-card/mini-store-bin-card.component';
import { GivenSparpartsListComponent } from './Power/given-sparparts-list/given-sparparts-list.component';
import { MaintenanceRequestRegisterAlllistComponent } from './PPC/maintenance-request-register-alllist/maintenance-request-register-alllist.component';
import { MaintenanceFinishedForClientComponent } from './PPC/maintenance-finished-for-client/maintenance-finished-for-client.component';
import { MiniStoreBinCardListComponent } from './Ministore/mini-store-bin-card-list/mini-store-bin-card-list.component';
import { ReceiveSpareFormComponent } from './Ministore/receive-spare-form/receive-spare-form.component';
import { MaintenanceRequestsComponent } from './PPC/maintenance-requests/maintenance-requests.component';
import { DeliverForClientsFormComponent } from './PPC/deliver-for-clients-form/deliver-for-clients-form.component';
import { MaintenanceRequestViewComponent } from './PPC/maintenance-request-view/maintenance-request-view.component';
import { MaintenanceReportComponent } from './PPC/maintenance-report/maintenance-report.component';
//import { MaintenanceRequestComponent } from './PPC/maintenance-request/maintenance-request.component';
import { MaintenanceRequestEditComponent } from './PPC/maintenance-request-edit/maintenance-request-edit.component';
import { EquipmentTypeComponentComponent } from './PPC/equipment-type.component/equipment-type.component.component';
import { EquipmentTypeComponent } from './PPC/equipment-type/equipment-type.component';
import { ViewEquipmentsComponent } from './PPC/view-equipments/view-equipments.component';
import { UpdateMiniStoreBinCardComponent } from './Ministore/update-mini-store-bin-card/update-mini-store-bin-card.component';
import { ViewSerialComponent } from './Ministore/view-serial/view-serial.component';
import { MinistoreReportComponent } from './Ministore/ministore-report/ministore-report.component';
import { DashboardComponent } from './dashboard/dashboard.component';

import { EtterRegistrationComponent } from './etter-registration/etter-registration.component';
import { DoOutComponent } from './PPC/do-out/do-out.component';
import { LetterComponent } from './PPC/letter/letter.component';
import { MaintainFormComponent } from './Power/maintain-form/maintain-form.component';
import { RejectRequestComponent } from './Ministore/reject-request/reject-request.component';
import { UnitLeaderDashboardComponent } from './unit-leader-dashboard/unit-leader-dashboard.component';
import { IssueSpareFormComponent } from './Ministore/issue-spare-form/issue-spare-form.component';
import { HandoverConfirmationComponent } from './Power/handover-confirmation/handover-confirmation.component';
import { MaintenanceCostReportComponent } from './PPC/maintenance-cost-report/maintenance-cost-report.component';
import { MaintenancePerformanceComponent } from './maintenance-performance/maintenance-performance.component';

@NgModule({
  declarations: [
    MaintenanceComponent,
    
    EditRequestComponent,
    MaintenanceRegisterListComponent,
    SparePartsRequestListComponent,
    SparePartsRequestFormComponent,
    SparePartsRequestDetailsComponent,
   
    MaintenanceRequestRegisterComponent,
    MaintenanceRequestRegisterListComponent,
    AssignMaintenanceComponent,
    ReassignMaintenanceComponent,
    MaintenanceRequestListComponent,
    MaintenanceSparePartRequestFormComponent,
    SparePartsRequestRespondComponent,
    MiniStoreBinCardComponent,
    GivenSparpartsListComponent,
    MaintenanceRequestRegisterAlllistComponent,
    MaintenanceFinishedForClientComponent,
    MiniStoreBinCardListComponent,
    ReceiveSpareFormComponent,
    MaintenanceRequestsComponent,
    DeliverForClientsFormComponent,
    MaintenanceRequestViewComponent,
    MaintenanceReportComponent,
    //MaintenanceRequestComponent,
    MaintenanceRequestEditComponent,
    EquipmentTypeComponentComponent,
    EquipmentTypeComponent,
    ViewEquipmentsComponent,
    UpdateMiniStoreBinCardComponent,
    ViewSerialComponent,
    MinistoreReportComponent,
    DashboardComponent,
    EtterRegistrationComponent,
    DoOutComponent,
    LetterComponent,
    MaintainFormComponent,
    RejectRequestComponent,
    UnitLeaderDashboardComponent,
    IssueSpareFormComponent,
    HandoverConfirmationComponent,
    MaintenanceCostReportComponent,
    MaintenancePerformanceComponent,
   
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaintenanceRoutingModule,
    
  ]
})
export class MaintenanceModule {}