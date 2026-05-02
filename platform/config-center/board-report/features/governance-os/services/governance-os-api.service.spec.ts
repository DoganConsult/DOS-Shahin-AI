import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceOsApiService } from './governance-os-api.service';

describe('GovernanceOsApiService', () => {
  let service: GovernanceOsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GovernanceOsApiService
      ]
    });
    service = TestBed.inject(GovernanceOsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
