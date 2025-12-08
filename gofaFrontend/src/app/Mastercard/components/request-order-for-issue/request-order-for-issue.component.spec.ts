import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestOrderForIssueComponent } from './request-order-for-issue.component';

describe('RequestOrderForIssueComponent', () => {
  let component: RequestOrderForIssueComponent;
  let fixture: ComponentFixture<RequestOrderForIssueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestOrderForIssueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestOrderForIssueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
