import { TestBed } from '@angular/core/testing';

import { SparePartsRequestService } from './spare-parts-request.service';

describe('SparePartsRequestService', () => {
  let service: SparePartsRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SparePartsRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
