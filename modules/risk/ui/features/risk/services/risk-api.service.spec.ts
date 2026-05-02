import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskApiService } from './risk-api.service';

describe('RiskApiService', () => {
  let service: RiskApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RiskApiService
      ]
    });
    service = TestBed.inject(RiskApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
