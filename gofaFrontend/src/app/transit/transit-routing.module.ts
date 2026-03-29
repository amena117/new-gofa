 // src/app/app-routing.module.ts
// import { NgModule } from '@angular/core';
// import { RouterModule, Routes } from '@angular/router';
// import { ReceivedItemsListComponent } from './components/received-items-list/received-items-list.component';
// import { SentForInspectionListComponent } from './components/sent-for-inspection-list/sent-for-inspection-list.component';
// import { InspectedItemsListComponent } from './components/inspected-items-list/inspected-items-list.component';
// import { SendToStoreFormComponent } from './components/send-to-store-form/send-to-store-form.component';

// const routes: Routes = [
//   { path: 'received-items', component: ReceivedItemsListComponent },
//   { path: 'sent-for-inspection', component: SentForInspectionListComponent },
//   { path: 'inspected-items', component: InspectedItemsListComponent },
//   { path: 'send-to-store', component: SendToStoreFormComponent },
//   { path: '', redirectTo: '/received-items', pathMatch: 'full' },
// ];

// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule],
// })
// export class AppRoutingModule {}



import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceiveItemFormComponent } from './components/receive-item-form/receive-item-form.component';
import { ReceivedItemsListComponent } from './components/received-items-list/received-items-list.component';
import { SentForInspectionListComponent } from './components/sent-for-inspection-list/sent-for-inspection-list.component';
import { InspectedItemsListComponent } from './components/inspected-items-list/inspected-items-list.component';
import { SendToStoreFormComponent } from './components/send-to-store-form/send-to-store-form.component';
import { EditItemComponent } from './components/edit-item/edit-item.component';
import { ViewDetailsComponent } from './components/view-details/view-details.component';
import { Model2ListComponent } from './components/model2-list/model2-list.component';
import { Model2EditComponent } from './components/model2-edit/model2-edit.component';
import { Model2DetailComponent } from './components/model2-detail/model2-detail.component';
import { Model2AddComponent } from './components/model2-add/model2-add.component';
import { AuthGuard } from '../guards/auth.guard';




const routes: Routes = [
  { path: 'receive-item-form', component: ReceiveItemFormComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: '', component: ReceivedItemsListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: 'sent-for-inspection', component: SentForInspectionListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: 'inspected-items', component: InspectedItemsListComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: 'send-to-store', component: SendToStoreFormComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: '', redirectTo: '', pathMatch: 'full' },
  { path: 'edit-item/:id', component: EditItemComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  {path: 'view-details/:id', component: ViewDetailsComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },

  { path: 'model2-list', component: Model2ListComponent },
  { path: 'model2-add', component: Model2AddComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: 'model2-edit/:id', component: Model2EditComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },
  { path: 'model2-detail/:id', component: Model2DetailComponent, canActivate: [AuthGuard], data: { roles: ['TRANSIT'] }  },





];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class TransitRoutingModule { }

