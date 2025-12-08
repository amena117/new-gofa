import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model19ListComponent } from './model19-list.component';

describe('Model19ListComponent', () => {
  let component: Model19ListComponent;
  let fixture: ComponentFixture<Model19ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model19ListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model19ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
