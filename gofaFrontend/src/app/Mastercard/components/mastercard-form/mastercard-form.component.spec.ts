import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MastercardFormComponent } from './mastercard-form.component';

describe('MastercardFormComponent', () => {
  let component: MastercardFormComponent;
  let fixture: ComponentFixture<MastercardFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MastercardFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MastercardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
