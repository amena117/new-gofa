import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditModel19Component } from './edit-model19.component';

describe('EditModel19Component', () => {
  let component: EditModel19Component;
  let fixture: ComponentFixture<EditModel19Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditModel19Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditModel19Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
