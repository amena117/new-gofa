import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialToolsRegisterListComponent } from './special-tools-register-list.component';

describe('SpecialToolsRegisterListComponent', () => {
  let component: SpecialToolsRegisterListComponent;
  let fixture: ComponentFixture<SpecialToolsRegisterListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpecialToolsRegisterListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpecialToolsRegisterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
