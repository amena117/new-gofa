import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitLeaderDashboardComponent } from './unit-leader-dashboard.component';

describe('UnitLeaderDashboardComponent', () => {
  let component: UnitLeaderDashboardComponent;
  let fixture: ComponentFixture<UnitLeaderDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UnitLeaderDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnitLeaderDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
