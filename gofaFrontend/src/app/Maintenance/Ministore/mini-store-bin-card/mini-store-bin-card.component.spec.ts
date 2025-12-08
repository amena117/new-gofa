import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniStoreBinCardComponent } from './mini-store-bin-card.component';

describe('MiniStoreBinCardComponent', () => {
  let component: MiniStoreBinCardComponent;
  let fixture: ComponentFixture<MiniStoreBinCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MiniStoreBinCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiniStoreBinCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
