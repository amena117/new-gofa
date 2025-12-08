import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field'; // Added
import { MatInputModule } from '@angular/material/input'; // Added
import { HttpClientXsrfModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';


// Transit Components
import { ReceiveItemFormComponent } from './transit/components/receive-item-form/receive-item-form.component';
import { ReceivedItemsListComponent } from './transit/components/received-items-list/received-items-list.component';
import { SentForInspectionListComponent } from './transit/components/sent-for-inspection-list/sent-for-inspection-list.component';
import { InspectedItemsListComponent } from './transit/components/inspected-items-list/inspected-items-list.component';
import { SendToStoreFormComponent } from './transit/components/send-to-store-form/send-to-store-form.component';
import { ViewDetailsComponent } from './transit/components/view-details/view-details.component';
import { EditItemComponent } from './transit/components/edit-item/edit-item.component';
import { Model2ListComponent } from './transit/components/model2-list/model2-list.component';
import { Model2AddComponent } from './transit/components/model2-add/model2-add.component';
import { Model2EditComponent } from './transit/components/model2-edit/model2-edit.component';
import { Model2DetailComponent } from './transit/components/model2-detail/model2-detail.component';
import { Model1ReportComponent } from './transit/components/model1-report/model1-report.component';

// Admin Components
import { WarehouseComponent } from './Admin/warehouse/warehouse.component';
import { ShelfComponent } from './Admin/shelf/shelf.component';
import { WarehouseListComponent } from './Admin/warehouse-list/warehouse-list.component';
import { ShelfListComponent } from './Admin/shelf-list/shelf-list.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { EditWarehouseComponent } from './Admin/edit-warehouse/edit-warehouse.component';
import { UserListComponent } from './Admin/user-list/user-list.component';

// Auth Components
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { MatIconModule } from '@angular/material/icon';

// Mastercard Components
import { MasterCardFormComponent } from './Mastercard/components/mastercard-form/mastercard-form.component';
import { MastercardListComponent } from './Mastercard/components/mastercard-list/mastercard-list.component';
import { MastercardEditComponent } from './Mastercard/components/mastercard-edit/mastercard-edit.component';
import { AddMasterCardReceivedComponent } from './Mastercard/components/add-master-card-received/add-master-card-received.component';
import { AddMasterCardIssuedComponent } from './Mastercard/components/add-master-card-issued/add-master-card-issued.component';
import { MasterCardDetailsComponent } from './Mastercard/components/master-card-details/master-card-details.component';
import { RequestOrderListComponent } from './Mastercard/components/request-order-list/request-order-list.component';
import { RequestOrderDetailComponent } from './Mastercard/components/request-order-detail/request-order-detail.component';

// Model22 Components
import { Model22RegistrationComponent } from './Model22/model22-registration/model22-registration.component';
import { Model22ListComponent } from './Model22/model22-list/model22-list.component';
import { Model22DetailComponent } from './Model22/model22-detail/model22-detail.component';
import { Model22ReportComponent } from './Model22/model22-report/model22-report.component';

// Shared Components
import { UnauthorizedComponent } from './Shared/unauthorized/unauthorized.component';
import { SharedSidebarComponent } from './shared-sidebar/shared-sidebar.component';
import { RequestOrderForIssueComponent } from './Mastercard/components/request-order-for-issue/request-order-for-issue.component';
import { EthiopianDateInputComponent } from './ethiopian-date-input/ethiopian-date-input.component';
import { RegistrationComponent } from './Warehose/registration/registration.component';
import { ListingComponent } from './Warehose/listing/listing.component';
import { ItemDetailsComponent } from './Warehose/item-details/item-details.component';
import { ItemTypeManagementComponent } from './Admin/item-type-management/item-type-management.component';
import { AddItemQuantityComponent } from './add-item-quantity/add-item-quantity.component';
import { ItemTransactionHistoryComponent } from './item-transaction-history/item-transaction-history.component';


// Services
import { AuthInterceptor } from './interceptors/auth-interceptor.service';
import { TransitService } from './transit/services/transit.service';
import { CsrfInitializerProvider } from './core/csrf-initializer.factory';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AmharicDatePipe } from './pipes/amharic-date.pipe';
import { InventorySummaryComponent } from './inventory-summary/inventory-summary.component';
import { TransactionReportComponent } from './Warehose/transaction-report/transaction-report.component';
import { MatNativeDateModule } from '@angular/material/core';
import { TeamLeaderDashboardComponent } from './team-leader-dashboard/team-leader-dashboard.component';
import { FromTransitComponent } from './Warehose/from-transit/from-transit.component';
import { RequestOrdersReportComponent } from './request-orders-report/request-orders-report.component';
import { ReportComponent } from './Mastercard/components/report/report.component';
import { ChartDirective } from './team-leader-dashboard/chart.directive';

@NgModule({
  declarations: [
    AppComponent,
    ChartDirective,
    ReceiveItemFormComponent,
    ReceivedItemsListComponent,
    SentForInspectionListComponent,
    InspectedItemsListComponent,
    SendToStoreFormComponent,
    ViewDetailsComponent,
    EditItemComponent,
    Model2ListComponent,
    Model2AddComponent,
    Model2EditComponent,
    Model2DetailComponent,
    Model1ReportComponent,
    WarehouseComponent,
    ShelfComponent,
    WarehouseListComponent,
    ShelfListComponent,
    AdminDashboardComponent,
    EditWarehouseComponent,
    UserListComponent,
    LoginComponent,
    RegisterComponent,
    MasterCardFormComponent,
    MastercardListComponent,
    MastercardEditComponent,
    AddMasterCardReceivedComponent,
    AddMasterCardIssuedComponent,
    MasterCardDetailsComponent,
    RequestOrderListComponent,
    RequestOrderDetailComponent,
    Model22RegistrationComponent,
    Model22ListComponent,
    Model22DetailComponent,
    Model22ReportComponent,
    UnauthorizedComponent,
    SharedSidebarComponent,
    RequestOrderForIssueComponent,
    EthiopianDateInputComponent,
    RegistrationComponent,
    ListingComponent,
    ItemDetailsComponent,
    ItemTypeManagementComponent,
    AddItemQuantityComponent,
    ItemTransactionHistoryComponent,
    AmharicDatePipe,
    InventorySummaryComponent,
    TransactionReportComponent,
    TeamLeaderDashboardComponent,
    FromTransitComponent,
    RequestOrdersReportComponent,
    ReportComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    
    HttpClientModule,
    BrowserAnimationsModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'XSRF-TOKEN',
      headerName: 'X-XSRF-TOKEN'
    }),
    RouterModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule, // Added for mat-error
    MatInputModule, // Added for mat-error
    MatAutocompleteModule,
    MatDatepickerModule,
    
    MatNativeDateModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
      
    },
    TransitService,
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }