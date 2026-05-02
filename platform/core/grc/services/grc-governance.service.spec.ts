import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcGovernanceService } from './grc-governance.service';

describe('GrcGovernanceService', () => {
  let service: GrcGovernanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcGovernanceService
      ]
    });
    service = TestBed.inject(GrcGovernanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
