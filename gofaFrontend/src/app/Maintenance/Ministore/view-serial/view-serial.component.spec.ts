import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSerialComponent } from './view-serial.component';

describe('ViewSerialComponent', () => {
  let component: ViewSerialComponent;
  let fixture: ComponentFixture<ViewSerialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewSerialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewSerialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
