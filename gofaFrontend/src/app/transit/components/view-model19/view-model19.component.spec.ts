import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewModel19Component } from './view-model19.component';

describe('ViewModel19Component', () => {
  let component: ViewModel19Component;
  let fixture: ComponentFixture<ViewModel19Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewModel19Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewModel19Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
