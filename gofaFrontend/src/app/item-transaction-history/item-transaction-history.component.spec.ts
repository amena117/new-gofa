import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemTransactionHistoryComponent } from './item-transaction-history.component';

describe('ItemTransactionHistoryComponent', () => {
  let component: ItemTransactionHistoryComponent;
  let fixture: ComponentFixture<ItemTransactionHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ItemTransactionHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemTransactionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
