import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceSparepartRequestFormComponent } from './maintenance-sparepart-request-form.component';

describe('MaintenanceSparepartRequestFormComponent', () => {
  let component: MaintenanceSparepartRequestFormComponent;
  let fixture: ComponentFixture<MaintenanceSparepartRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenanceSparepartRequestFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceSparepartRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
