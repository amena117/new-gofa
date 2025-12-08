import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model22ListComponent } from './model22-list.component';

describe('Model22ListComponent', () => {
  let component: Model22ListComponent;
  let fixture: ComponentFixture<Model22ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model22ListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model22ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
