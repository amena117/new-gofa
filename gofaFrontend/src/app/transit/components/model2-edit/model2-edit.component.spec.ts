import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model2EditComponent } from './model2-edit.component';

describe('Model2EditComponent', () => {
  let component: Model2EditComponent;
  let fixture: ComponentFixture<Model2EditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model2EditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model2EditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
