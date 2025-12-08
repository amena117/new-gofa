import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model22ReportComponent } from './model22-report.component';

describe('Model22ReportComponent', () => {
  let component: Model22ReportComponent;
  let fixture: ComponentFixture<Model22ReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model22ReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model22ReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
