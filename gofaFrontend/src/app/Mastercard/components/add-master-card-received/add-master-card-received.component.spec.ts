import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMasterCardReceivedComponent } from './add-master-card-received.component';

describe('AddMasterCardReceivedComponent', () => {
  let component: AddMasterCardReceivedComponent;
  let fixture: ComponentFixture<AddMasterCardReceivedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddMasterCardReceivedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMasterCardReceivedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
