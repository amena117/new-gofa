import { TestBed } from '@angular/core/testing';

import { WarehouseService } from './warehouseservice.service';

describe('WarehouseserviceService', () => {
  let service: WarehouseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WarehouseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
