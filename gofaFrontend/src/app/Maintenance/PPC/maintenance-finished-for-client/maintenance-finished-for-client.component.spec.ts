import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceFinishedForClientComponent } from './maintenance-finished-for-client.component';

describe('MaintenanceFinishedForClientComponent', () => {
  let component: MaintenanceFinishedForClientComponent;
  let fixture: ComponentFixture<MaintenanceFinishedForClientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceFinishedForClientComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceFinishedForClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
