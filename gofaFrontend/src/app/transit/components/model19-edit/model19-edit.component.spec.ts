import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model19EditComponent } from './model19-edit.component';

describe('Model19EditComponent', () => {
  let component: Model19EditComponent;
  let fixture: ComponentFixture<Model19EditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model19EditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model19EditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
