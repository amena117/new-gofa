import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageHistoryTabsComponent } from './page-history-tabs.component';

describe('PageHistoryTabsComponent', () => {
  let component: PageHistoryTabsComponent;
  let fixture: ComponentFixture<PageHistoryTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageHistoryTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageHistoryTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
