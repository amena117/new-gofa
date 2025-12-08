import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliverForClientsFormComponent } from './deliver-for-clients-form.component';

describe('DeliverForClientsFormComponent', () => {
  let component: DeliverForClientsFormComponent;
  let fixture: ComponentFixture<DeliverForClientsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeliverForClientsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliverForClientsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
