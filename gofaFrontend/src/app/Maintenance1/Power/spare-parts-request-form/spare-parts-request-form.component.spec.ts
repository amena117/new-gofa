import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparePartsRequestFormComponent } from './spare-parts-request-form.component';

describe('SparePartsRequestFormComponent', () => {
  let component: SparePartsRequestFormComponent;
  let fixture: ComponentFixture<SparePartsRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SparePartsRequestFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SparePartsRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
