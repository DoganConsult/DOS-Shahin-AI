import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComplianceApiService } from './compliance-api.service';

describe('ComplianceApiService', () => {
  let service: ComplianceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ComplianceApiService
      ]
    });
    service = TestBed.inject(ComplianceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
