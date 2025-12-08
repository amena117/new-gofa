import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceRequestRegisterListComponent } from './maintenance-request-register-list.component';

describe('MaintenanceRequestRegisterListComponent', () => {
  let component: MaintenanceRequestRegisterListComponent;
  let fixture: ComponentFixture<MaintenanceRequestRegisterListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceRequestRegisterListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceRequestRegisterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
