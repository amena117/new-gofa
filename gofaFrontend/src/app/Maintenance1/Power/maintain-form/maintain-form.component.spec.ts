import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintainFormComponent } from './maintain-form.component';

describe('MaintainFormComponent', () => {
  let component: MaintainFormComponent;
  let fixture: ComponentFixture<MaintainFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintainFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintainFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
