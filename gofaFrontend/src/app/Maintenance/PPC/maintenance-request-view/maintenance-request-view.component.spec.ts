import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceRequestViewComponent } from './maintenance-request-view.component';

describe('MaintenanceRequestViewComponent', () => {
  let component: MaintenanceRequestViewComponent;
  let fixture: ComponentFixture<MaintenanceRequestViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceRequestViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceRequestViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
