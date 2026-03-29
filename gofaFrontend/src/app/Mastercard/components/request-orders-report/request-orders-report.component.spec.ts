import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestOrdersReportComponent } from './request-orders-report.component';

describe('RequestOrdersReportComponent', () => {
  let component: RequestOrdersReportComponent;
  let fixture: ComponentFixture<RequestOrdersReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestOrdersReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestOrdersReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});