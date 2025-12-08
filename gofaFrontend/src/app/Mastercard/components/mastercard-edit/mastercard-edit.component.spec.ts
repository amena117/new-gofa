import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MastercardEditComponent } from './mastercard-edit.component';

describe('MastercardEditComponent', () => {
  let component: MastercardEditComponent;
  let fixture: ComponentFixture<MastercardEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MastercardEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MastercardEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
