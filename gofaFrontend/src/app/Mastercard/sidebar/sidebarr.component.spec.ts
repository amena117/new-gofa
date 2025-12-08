import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TSidebarComponent } from './sidebarr.component';

describe('SidebarComponent', () => {
  let component: TSidebarComponent;
  let fixture: ComponentFixture<TSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
