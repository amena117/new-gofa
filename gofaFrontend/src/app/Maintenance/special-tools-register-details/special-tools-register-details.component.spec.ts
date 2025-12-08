import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialToolsRegisterDetailsComponent } from './special-tools-register-details.component';

describe('SpecialToolsRegisterDetailsComponent', () => {
  let component: SpecialToolsRegisterDetailsComponent;
  let fixture: ComponentFixture<SpecialToolsRegisterDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpecialToolsRegisterDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpecialToolsRegisterDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
