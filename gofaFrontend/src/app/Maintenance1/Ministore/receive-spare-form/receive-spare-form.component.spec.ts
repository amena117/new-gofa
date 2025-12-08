import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceiveSpareFormComponent } from './receive-spare-form.component';

describe('ReceiveSpareFormComponent', () => {
  let component: ReceiveSpareFormComponent;
  let fixture: ComponentFixture<ReceiveSpareFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReceiveSpareFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceiveSpareFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
