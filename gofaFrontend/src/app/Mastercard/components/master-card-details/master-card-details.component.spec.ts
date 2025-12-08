import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterCardDetailsComponent } from './master-card-details.component';

describe('MasterCardDetailsComponent', () => {
  let component: MasterCardDetailsComponent;
  let fixture: ComponentFixture<MasterCardDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MasterCardDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterCardDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
