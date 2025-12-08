import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GivenSparpartsListComponent } from './given-sparparts-list.component';

describe('GivenSparpartsListComponent', () => {
  let component: GivenSparpartsListComponent;
  let fixture: ComponentFixture<GivenSparpartsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GivenSparpartsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GivenSparpartsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
