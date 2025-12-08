import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model2AddComponent } from './model2-add.component';

describe('Model2AddComponent', () => {
  let component: Model2AddComponent;
  let fixture: ComponentFixture<Model2AddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model2AddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model2AddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
