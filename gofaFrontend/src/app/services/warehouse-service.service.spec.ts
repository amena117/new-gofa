import { TestBed } from '@angular/core/testing';

import { WarehouseService } from './warehouse-service.service';

describe('WarehouseServiceService', () => {
  let service: WarehouseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WarehouseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
