import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model2DetailComponent } from './model2-detail.component';

describe('Model2DetailComponent', () => {
  let component: Model2DetailComponent;
  let fixture: ComponentFixture<Model2DetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model2DetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model2DetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
