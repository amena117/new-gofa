import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestOrderListComponent } from './request-order-list.component';

describe('RequestOrderListComponent', () => {
  let component: RequestOrderListComponent;
  let fixture: ComponentFixture<RequestOrderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestOrderListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestOrderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
