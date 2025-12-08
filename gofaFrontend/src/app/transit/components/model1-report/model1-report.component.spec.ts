import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model1ReportComponent } from './model1-report.component';

describe('Model1ReportComponent', () => {
  let component: Model1ReportComponent;
  let fixture: ComponentFixture<Model1ReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model1ReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model1ReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
