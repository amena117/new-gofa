import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FromTransitComponent } from './from-transit.component';

describe('FromTransitComponent', () => {
  let component: FromTransitComponent;
  let fixture: ComponentFixture<FromTransitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FromTransitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FromTransitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
