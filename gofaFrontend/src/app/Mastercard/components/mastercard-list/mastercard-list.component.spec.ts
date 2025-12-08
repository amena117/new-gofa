import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MastercardListComponent } from './mastercard-list.component';

describe('MastercardListComponent', () => {
  let component: MastercardListComponent;
  let fixture: ComponentFixture<MastercardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MastercardListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MastercardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
