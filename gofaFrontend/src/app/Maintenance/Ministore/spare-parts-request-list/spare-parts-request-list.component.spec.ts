import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparePartsRequestListComponent } from './spare-parts-request-list.component';

describe('SparePartsRequestListComponent', () => {
  let component: SparePartsRequestListComponent;
  let fixture: ComponentFixture<SparePartsRequestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SparePartsRequestListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SparePartsRequestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
