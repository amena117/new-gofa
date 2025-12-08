import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectedItemsListComponent } from './inspected-items-list.component';

describe('InspectedItemsListComponent', () => {
  let component: InspectedItemsListComponent;
  let fixture: ComponentFixture<InspectedItemsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InspectedItemsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectedItemsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
