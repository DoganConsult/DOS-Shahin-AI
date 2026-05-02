import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceApiService } from './governance-api.service';
import { safeQuery } from "@dos/db";

describe('GovernanceApiService', () => {
  let service: GovernanceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GovernanceApiService
      ]
    });
    service = TestBed.inject(GovernanceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
