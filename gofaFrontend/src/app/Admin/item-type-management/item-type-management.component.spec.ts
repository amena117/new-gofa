import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemTypeManagementComponent } from './item-type-management.component';

describe('ItemTypeManagementComponent', () => {
  let component: ItemTypeManagementComponent;
  let fixture: ComponentFixture<ItemTypeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ItemTypeManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemTypeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
