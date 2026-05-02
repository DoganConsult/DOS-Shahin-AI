import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskSmartApiService } from './risk-smart-api.service';

describe('RiskSmartApiService', () => {
  let service: RiskSmartApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RiskSmartApiService
      ]
    });
    service = TestBed.inject(RiskSmartApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
