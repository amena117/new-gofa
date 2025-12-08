import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniStoreBinCardListComponent } from './mini-store-bin-card-list.component';

describe('MiniStoreBinCardListComponent', () => {
  let component: MiniStoreBinCardListComponent;
  let fixture: ComponentFixture<MiniStoreBinCardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MiniStoreBinCardListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiniStoreBinCardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
