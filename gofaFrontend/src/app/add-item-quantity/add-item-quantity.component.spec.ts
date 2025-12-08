import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddItemQuantityComponent } from './add-item-quantity.component';

describe('AddItemQuantityComponent', () => {
  let component: AddItemQuantityComponent;
  let fixture: ComponentFixture<AddItemQuantityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddItemQuantityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddItemQuantityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
