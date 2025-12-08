import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipmentTypeComponentComponent } from './equipment-type.component.component';

describe('EquipmentTypeComponentComponent', () => {
  let component: EquipmentTypeComponentComponent;
  let fixture: ComponentFixture<EquipmentTypeComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EquipmentTypeComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipmentTypeComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
