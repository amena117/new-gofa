import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparePartsRequestRespondComponent } from './spare-parts-request-respond.component';

describe('SparePartsRequestRespondComponent', () => {
  let component: SparePartsRequestRespondComponent;
  let fixture: ComponentFixture<SparePartsRequestRespondComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SparePartsRequestRespondComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SparePartsRequestRespondComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
