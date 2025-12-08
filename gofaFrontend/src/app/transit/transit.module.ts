
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';


import { CommonModule } from '@angular/common';

import { ReactiveFormsModule } from '@angular/forms';
import { EditModel19Component } from './components/edit-model19/edit-model19.component';
import { ViewModel19Component } from './components/view-model19/view-model19.component';
import { Model19EditComponent } from './components/model19-edit/model19-edit.component';
import { Model2EditComponent } from './components/model2-edit/model2-edit.component';
import { Model2ListComponent } from './components/model2-list/model2-list.component';
import { Model2AddComponent } from './components/model2-add/model2-add.component';
import { Model2DetailComponent } from './components/model2-detail/model2-detail.component';
import { Model1ReportComponent } from './components/model1-report/model1-report.component';
@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  declarations: [
    EditModel19Component,
    ViewModel19Component,
    Model19EditComponent,
    // Model1ReportComponent,
    // Model2EditComponent,
    // Model2ListComponent,
    // Model2AddComponent,
    // Model2DetailComponent
  ],
})
export class TransitModule { }

