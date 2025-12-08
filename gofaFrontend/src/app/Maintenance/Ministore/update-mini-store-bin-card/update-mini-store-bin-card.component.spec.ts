import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateMiniStoreBinCardComponent } from './update-mini-store-bin-card.component';

describe('UpdateMiniStoreBinCardComponent', () => {
  let component: UpdateMiniStoreBinCardComponent;
  let fixture: ComponentFixture<UpdateMiniStoreBinCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateMiniStoreBinCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateMiniStoreBinCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
