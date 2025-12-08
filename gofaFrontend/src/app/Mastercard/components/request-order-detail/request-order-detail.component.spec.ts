import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestOrderDetailComponent } from './request-order-detail.component';

describe('RequestOrderDetailComponent', () => {
  let component: RequestOrderDetailComponent;
  let fixture: ComponentFixture<RequestOrderDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestOrderDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestOrderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
