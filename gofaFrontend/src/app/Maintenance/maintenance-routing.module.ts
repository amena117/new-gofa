import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { MaintenanceComponent } from './maintenance.component';
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
import { MaintenanceRequestEditComponent } from './PPC/maintenance-request-edit/maintenance-request-edit.component';
import { UnitLeaderDashboardComponent } from './unit-leader-dashboard/unit-leader-dashboard.component';
import { IssueSpareFormComponent } from './Ministore/issue-spare-form/issue-spare-form.component';
import { HandoverConfirmationComponent } from './Power/handover-confirmation/handover-confirmation.component';
import { MaintenanceCostReportComponent } from './PPC/maintenance-cost-report/maintenance-cost-report.component';
import { MaintenancePerformanceComponent } from './maintenance-performance/maintenance-performance.component';


const routes: Routes = [
  {
    path: '',
    component: MaintenanceComponent,
    children: [
      // Dashboard and Request Management
      //{ path: 'dashboard', component: DashboardComponent },
      { path: 'request-form', component: MaintenanceRequestRegisterComponent },
      { path: 'request-list', component: MaintenanceRequestRegisterListComponent },
      { path: 'assign-maintenance', component: AssignMaintenanceComponent },
      { path: 'reassign-maintenance', component: ReassignMaintenanceComponent },
      { path: 'power-maintReqList', component: MaintenanceRequestListComponent},
      { path: 'request-details/:id', component: RequestDetailsComponent },
      { path: 'edit-request/:id', component: EditRequestComponent },
      { path: 'equipmentadd', component: EquipmentTypeComponent},
      { path: 'equipments', component: ViewEquipmentsComponent },
      { path: 'doOut', component: DoOutComponent },
      { path: 'handover-confirmation', component: HandoverConfirmationComponent },
      { path: 'cost-report', component: MaintenanceCostReportComponent },
      { path: 'performance-report', component: MaintenancePerformanceComponent },

      // Maintenance Register

      { path: 'register-list', component: MaintenanceRegisterListComponent },

      // Spare Parts Requests
      { path: 'addministorebincard', component: MiniStoreBinCardComponent},
      { path: 'givenSparesto', component: GivenSparpartsListComponent},
      { path: 'spare-parts-requests', component: SparePartsRequestListComponent },
      { path: 'spare-parts-respond', component: SparePartsRequestRespondComponent},
      { path: 'spare-parts-requests/add', component: SparePartsRequestFormComponent },
      { path: 'spare-parts-requests/edit/:id', component: SparePartsRequestFormComponent },
      { path: 'spare-parts-requests/details/:id', component: SparePartsRequestDetailsComponent },

      // Special Tools Register
      { path: 'special-tools', component: SpecialToolsRegisterListComponent },
      { path: 'special-toolss/add', component: SpecialToolsRegisterFormComponent },
      { path: 'special-tools/edit/:id', component: SpecialToolsRegisterFormComponent },
      { path: 'special-tools/details/:id', component: SpecialToolsRegisterDetailsComponent },
      { path: 'maintenance/edit/:worksOrderNumber',component: MaintenanceRequestEditComponent },

      { path: 'bincard-list', component: MiniStoreBinCardListComponent},
      { path: 'receive-spare-form-12', component: ReceiveSpareFormComponent},
      { path: 'maintenance-finished', component: MaintenanceRequestsComponent },
      { path: 'update-delivery/:worksOrderNumber', component: DeliverForClientsFormComponent },
      { path: 'MRRListAll', redirectTo: 'power-maintReqList', pathMatch: 'full' },
      { path: 'Give-maintainedEqupment', component: MaintenanceFinishedForClientComponent},
      { path: "view-client-data", component: MaintenanceRequestViewComponent},
      { path: "generate-report", component: MaintenanceReportComponent},
      { path: 'special-tools-add', component: SpecialToolsRegisterFormComponent},
      { path: 'update/:id', component: UpdateMiniStoreBinCardComponent },
      { path: 'view-serials', component: ViewSerialComponent},
      { path: 'report-ministore', component: MinistoreReportComponent},
      { path: 'dashboard', component: DashboardComponent},
      { path: 'unit-leader-dashboard', component: UnitLeaderDashboardComponent },
      { path: 'Add_Letter', component: EtterRegistrationComponent},
      { path: 'letter_fetch', component: LetterComponent },
      { path: 'maintain/:worksOrderNumber', component: MaintainFormComponent }, 
      { path: 'reject-request', component: RejectRequestComponent },
      { path: 'issue-spare-form', component: IssueSpareFormComponent },
      // Default Route (Redirect to Dashboard)
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MaintenanceRoutingModule {  }