import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RemediationApiService } from './remediation-api.service';

describe('RemediationApiService', () => {
  let service: RemediationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RemediationApiService
      ]
    });
    service = TestBed.inject(RemediationApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
