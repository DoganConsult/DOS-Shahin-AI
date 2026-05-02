import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskComplianceApiService } from './risk-compliance-api.service';

describe('RiskComplianceApiService', () => {
  let service: RiskComplianceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RiskComplianceApiService
      ]
    });
    service = TestBed.inject(RiskComplianceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
