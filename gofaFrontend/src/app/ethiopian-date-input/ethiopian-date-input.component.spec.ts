import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EthiopianDateInputComponent } from './ethiopian-date-input.component';

describe('EthiopianDateInputComponent', () => {
  let component: EthiopianDateInputComponent;
  let fixture: ComponentFixture<EthiopianDateInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EthiopianDateInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EthiopianDateInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
