import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMasterCardIssuedComponent } from './add-master-card-issued.component';

describe('AddMasterCardIssuedComponent', () => {
  let component: AddMasterCardIssuedComponent;
  let fixture: ComponentFixture<AddMasterCardIssuedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddMasterCardIssuedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMasterCardIssuedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
