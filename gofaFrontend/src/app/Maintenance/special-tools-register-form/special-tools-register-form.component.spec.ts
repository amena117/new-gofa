import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialToolsRegisterFormComponent } from './special-tools-register-form.component';

describe('SpecialToolsRegisterFormComponent', () => {
  let component: SpecialToolsRegisterFormComponent;
  let fixture: ComponentFixture<SpecialToolsRegisterFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpecialToolsRegisterFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpecialToolsRegisterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
