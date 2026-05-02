import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyImpactApiService } from './policy-impact-api.service';

describe('PolicyImpactApiService', () => {
  let service: PolicyImpactApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PolicyImpactApiService
      ]
    });
    service = TestBed.inject(PolicyImpactApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
