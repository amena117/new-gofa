import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceRequestRegisterAlllistComponent } from './maintenance-request-register-alllist.component';

describe('MaintenanceRequestRegisterAlllistComponent', () => {
  let component: MaintenanceRequestRegisterAlllistComponent;
  let fixture: ComponentFixture<MaintenanceRequestRegisterAlllistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceRequestRegisterAlllistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceRequestRegisterAlllistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
