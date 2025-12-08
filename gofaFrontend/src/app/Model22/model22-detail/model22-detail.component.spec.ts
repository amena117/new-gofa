import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model22DetailComponent } from './model22-detail.component';

describe('Model22DetailComponent', () => {
  let component: Model22DetailComponent;
  let fixture: ComponentFixture<Model22DetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model22DetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model22DetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
