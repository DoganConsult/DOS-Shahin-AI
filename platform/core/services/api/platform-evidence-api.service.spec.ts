import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformEvidenceApiService } from './platform-evidence-api.service';

describe('PlatformEvidenceApiService', () => {
  let service: PlatformEvidenceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlatformEvidenceApiService
      ]
    });
    service = TestBed.inject(PlatformEvidenceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
