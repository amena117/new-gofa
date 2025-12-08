import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceRegisterListComponent } from './maintenance-register-list.component';

describe('MaintenanceRegisterListComponent', () => {
  let component: MaintenanceRegisterListComponent;
  let fixture: ComponentFixture<MaintenanceRegisterListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceRegisterListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceRegisterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
