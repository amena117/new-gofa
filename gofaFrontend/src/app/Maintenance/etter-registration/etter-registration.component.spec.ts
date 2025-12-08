import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtterRegistrationComponent } from './etter-registration.component';

describe('EtterRegistrationComponent', () => {
  let component: EtterRegistrationComponent;
  let fixture: ComponentFixture<EtterRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EtterRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EtterRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
