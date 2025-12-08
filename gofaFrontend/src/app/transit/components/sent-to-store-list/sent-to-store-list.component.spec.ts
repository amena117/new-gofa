import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SentToStoreListComponent } from './sent-to-store-list.component';

describe('SentToStoreListComponent', () => {
  let component: SentToStoreListComponent;
  let fixture: ComponentFixture<SentToStoreListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SentToStoreListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SentToStoreListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
