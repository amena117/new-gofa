import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Model22RegistrationComponent } from './model22-registration.component';

describe('Model22RegistrationComponent', () => {
  let component: Model22RegistrationComponent;
  let fixture: ComponentFixture<Model22RegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Model22RegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Model22RegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
