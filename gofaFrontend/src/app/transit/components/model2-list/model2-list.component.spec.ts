import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model2ListComponent } from './model2-list.component';

describe('Model2ListComponent', () => {
  let component: Model2ListComponent;
  let fixture: ComponentFixture<Model2ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model2ListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model2ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
