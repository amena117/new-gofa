import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SentForInspectionListComponent } from './sent-for-inspection-list.component';

describe('SentForInspectionListComponent', () => {
  let component: SentForInspectionListComponent;
  let fixture: ComponentFixture<SentForInspectionListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SentForInspectionListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SentForInspectionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
