import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceRequestEditComponent } from './maintenance-request-edit.component';

describe('MaintenanceRequestEditComponent', () => {
  let component: MaintenanceRequestEditComponent;
  let fixture: ComponentFixture<MaintenanceRequestEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceRequestEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceRequestEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
