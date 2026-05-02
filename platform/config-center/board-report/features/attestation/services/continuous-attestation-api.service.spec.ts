import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ContinuousAttestationApiService } from './continuous-attestation-api.service';

describe('ContinuousAttestationApiService', () => {
  let service: ContinuousAttestationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ContinuousAttestationApiService
      ]
    });
    service = TestBed.inject(ContinuousAttestationApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
