import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparePartsRequestDetailsComponent } from './spare-parts-request-details.component';

describe('SparePartsRequestDetailsComponent', () => {
  let component: SparePartsRequestDetailsComponent;
  let fixture: ComponentFixture<SparePartsRequestDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SparePartsRequestDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SparePartsRequestDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
