import { TestBed } from '@angular/core/testing';

import { SpecialToolsRegisterService } from './special-tools-register.service';

describe('SpecialToolsRegisterService', () => {
  let service: SpecialToolsRegisterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpecialToolsRegisterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
