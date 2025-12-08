import { TestBed } from '@angular/core/testing';

import { Model22Service } from './model22.service';

describe('Model22Service', () => {
  let service: Model22Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Model22Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
