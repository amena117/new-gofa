import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoOutComponent } from './do-out.component';

describe('DoOutComponent', () => {
  let component: DoOutComponent;
  let fixture: ComponentFixture<DoOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoOutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
