import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiveItemFormComponent } from './receive-item-form.component';

describe('ReceiveItemFormComponent', () => {
  let component: ReceiveItemFormComponent;
  let fixture: ComponentFixture<ReceiveItemFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReceiveItemFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceiveItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
