import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MinistoreReportComponent } from './ministore-report.component';

describe('MinistoreReportComponent', () => {
  let component: MinistoreReportComponent;
  let fixture: ComponentFixture<MinistoreReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MinistoreReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MinistoreReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
