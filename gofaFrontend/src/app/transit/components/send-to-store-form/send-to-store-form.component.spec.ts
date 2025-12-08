import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendToStoreFormComponent } from './send-to-store-form.component';

describe('SendToStoreFormComponent', () => {
  let component: SendToStoreFormComponent;
  let fixture: ComponentFixture<SendToStoreFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SendToStoreFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendToStoreFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
