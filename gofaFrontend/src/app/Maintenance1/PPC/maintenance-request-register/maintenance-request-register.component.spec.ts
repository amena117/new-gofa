import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceRequestRegisterComponent } from './maintenance-request-register.component';

describe('MaintenanceRequestRegisterComponent', () => {
  let component: MaintenanceRequestRegisterComponent;
  let fixture: ComponentFixture<MaintenanceRequestRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceRequestRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceRequestRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
