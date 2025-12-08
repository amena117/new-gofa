import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RedirectIfAuthenticatedGuard } from './guards/redirect-if-authenticated.guard';

// Components
import { ShelfComponent } from './Admin/shelf/shelf.component';
import { WarehouseComponent } from './Admin/warehouse/warehouse.component';
import { SendToStoreFormComponent } from './transit/components/send-to-store-form/send-to-store-form.component';
import { InspectedItemsListComponent } from './transit/components/inspected-items-list/inspected-items-list.component';
import { ReceivedItemsListComponent } from './transit/components/received-items-list/received-items-list.component';
import { SentForInspectionListComponent } from './transit/components/sent-for-inspection-list/sent-for-inspection-list.component';
import { ReceiveItemFormComponent } from './transit/components/receive-item-form/receive-item-form.component';
import { WarehouseListComponent } from './Admin/warehouse-list/warehouse-list.component';
import { ShelfListComponent } from './Admin/shelf-list/shelf-list.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { TeamLeaderDashboardComponent } from './team-leader-dashboard/team-leader-dashboard.component';
import { EditWarehouseComponent } from './Admin/edit-warehouse/edit-warehouse.component';
import { UserListComponent } from './Admin/user-list/user-list.component';
import { EditItemComponent } from './transit/components/edit-item/edit-item.component';
import { Model19ListComponent } from './transit/components/model19-list/model19-list.component';
import { ViewDetailsComponent } from './transit/components/view-details/view-details.component';
import { TransitComponent } from './transit/transit.component';
import { MasterCardFormComponent } from './Mastercard/components/mastercard-form/mastercard-form.component';
import { MastercardListComponent } from './Mastercard/components/mastercard-list/mastercard-list.component';
import { MastercardEditComponent } from './Mastercard/components/mastercard-edit/mastercard-edit.component';
import { UnauthorizedComponent } from './Shared/unauthorized/unauthorized.component';
import { AddMasterCardReceivedComponent } from './Mastercard/components/add-master-card-received/add-master-card-received.component';
import { AddMasterCardIssuedComponent } from './Mastercard/components/add-master-card-issued/add-master-card-issued.component';
import { MasterCardDetailsComponent } from './Mastercard/components/master-card-details/master-card-details.component';
import { Model22RegistrationComponent } from './Model22/model22-registration/model22-registration.component';
import { Model22ListComponent } from './Model22/model22-list/model22-list.component';
import { Model22DetailComponent } from './Model22/model22-detail/model22-detail.component';
import { Model22ReportComponent } from './Model22/model22-report/model22-report.component';
import { Model2DetailComponent } from './transit/components/model2-detail/model2-detail.component';
import { Model2EditComponent } from './transit/components/model2-edit/model2-edit.component';
import { Model2ListComponent } from './transit/components/model2-list/model2-list.component';
import { Model2AddComponent } from './transit/components/model2-add/model2-add.component';
import { Model1ReportComponent } from './transit/components/model1-report/model1-report.component';
import { RequestOrderDetailComponent } from './Mastercard/components/request-order-detail/request-order-detail.component';
import { RequestOrderForIssueComponent } from './Mastercard/components/request-order-for-issue/request-order-for-issue.component';
import { RequestOrderListComponent } from './Mastercard/components/request-order-list/request-order-list.component';
import { RegistrationComponent } from './Warehose/registration/registration.component';
import { ListingComponent } from './Warehose/listing/listing.component';
import { ItemDetailsComponent } from './Warehose/item-details/item-details.component';
import { ItemTypeManagementComponent } from './Admin/item-type-management/item-type-management.component';
import { AddItemQuantityComponent } from './add-item-quantity/add-item-quantity.component';
import { ItemTransactionHistoryComponent } from './item-transaction-history/item-transaction-history.component';
import { DashboardComponent } from './Maintenance/dashboard/dashboard.component';
import { InventorySummaryComponent } from './inventory-summary/inventory-summary.component';
import { TransactionReportComponent } from './Warehose/transaction-report/transaction-report.component';
import { FromTransitComponent } from './Warehose/from-transit/from-transit.component';
import { MasterCardDashboardComponent } from './Mastercard/components/dashboard/dashboard.component';
import { ReportComponent } from './Mastercard/components/report/report.component';
import { RequestOrdersReportComponent } from './request-orders-report/request-orders-report.component';

const routes: Routes = [
  { path: 'register-item', component: RegistrationComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },
  { path: 'items', component: ListingComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] } },
  { path: 'item/:id', component: ItemDetailsComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] } },
  { path: 'item-transaction-history', component: ItemTransactionHistoryComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-item-quantity', component: AddItemQuantityComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },
  { path: 'inventory-summary', component: InventorySummaryComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },
  { path: 'from-transit', component: FromTransitComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },

  { path: 'shelf', component: ShelfComponent, canActivate: [AuthGuard], data: { roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] } },
  { path: 'shelves', component: ShelfListComponent, canActivate: [AuthGuard], data: { roles: ['SUPER_ADMIN','SANDD_ADMIN'] } },
  { path: 'warehouse', component: WarehouseComponent, canActivate: [AuthGuard], data: { roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] } },
  { path: 'item-types', component: ItemTypeManagementComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },
  { path: 'transaction-report', component: TransactionReportComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] } },
  { 
    path: 'warehouses', 
    component: WarehouseListComponent, 
    canActivate: [AuthGuard], 
    data: { roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] },
    children: [
      { path: 'edit/:id', component: EditWarehouseComponent }
    ]
  },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard], data: { roles: ['SUPER_ADMIN'] } },
  { path: 'users', component: UserListComponent, canActivate: [AuthGuard], data: { roles: ['SUPER_ADMIN', 'SANDD_ADMIN', 'MAINTENANCE_ADMIN'] } },
  { path: 'team-leader-dashboard', component: TeamLeaderDashboardComponent, canActivate: [AuthGuard], data: { roles: ['SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] } },

  // Transit routes moved from R1
  { path: 'transit/receive-item-form', component: ReceiveItemFormComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit-root', component: TransitComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/received-items', component: ReceivedItemsListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT', 'PROPERTY_CONTROL'] } },
  { path: 'transit/sent-for-inspection', component: SentForInspectionListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/inspected-items', component: InspectedItemsListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/send-to-store', component: SendToStoreFormComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/edit-item/:id', component: EditItemComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/view-details/:id', component: ViewDetailsComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT', 'PROPERTY_CONTROL'] } },
  { path: 'transit/model19-list', component: Model19ListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/model2-list', component: Model2ListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/model2-add', component: Model2AddComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/model2-edit/:id', component: Model2EditComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/model2-detail/:id', component: Model2DetailComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },
  { path: 'transit/model1-report', component: Model1ReportComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] } },

  { path: 'MasterCard/mastercard-list', component: MastercardListComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/mastercard-form', component: MasterCardFormComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/master-card-received/:id', component: AddMasterCardReceivedComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/mastercard-edit/:id', component: MastercardEditComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/master-card-issued/:id', component: AddMasterCardIssuedComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/master-card-details/:id', component: MasterCardDetailsComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  {path:'MasterCard/dashboard',component:MasterCardDashboardComponent,canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] }},

  { path: 'MasterCard/request-order-for-issue', component: RequestOrderForIssueComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/request-roder-list', component: RequestOrderListComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/request-order-detail/:id', component: RequestOrderDetailComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/report', component:ReportComponent , canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'MasterCard/request-order/report', component: RequestOrdersReportComponent, canActivate: [AuthGuard], data: { roles: ['PROPERTY_CONTROL'] } },
  { path: 'model22report', component: Model22ReportComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'PROPERTY_CONTROL'] } },


  { path: 'model22register', component: Model22RegistrationComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] } },
  { path: 'model22-list', component: Model22ListComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 'PROPERTY_CONTROL'] } },
  { path: 'model22-detail/:id', component: Model22DetailComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 'PROPERTY_CONTROL'] } },
  { path: 'model22report', component: Model22ReportComponent, canActivate: [AuthGuard], data: { roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'PROPERTY_CONTROL'] } },

  { path: 'login', component: LoginComponent, canActivate: [RedirectIfAuthenticatedGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [AuthGuard], data: { roles: ['SUPER_ADMIN', 'SANDD_ADMIN', 'MAINTENANCE_ADMIN'] } },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Lazy-loaded Maintenance Module
  {
    path: 'maintenance',
    loadChildren: () => import('../app/Maintenance/maintenance.module').then(m => m.MaintenanceModule)
  },

  // Default and Wildcard Routes
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}