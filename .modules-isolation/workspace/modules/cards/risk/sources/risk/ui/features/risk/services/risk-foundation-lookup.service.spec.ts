import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskFoundationLookupService } from './risk-foundation-lookup.service';

describe('RiskFoundationLookupService', () => {
  let service: RiskFoundationLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RiskFoundationLookupService
      ]
    });
    service = TestBed.inject(RiskFoundationLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
