import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EvidenceApiService } from './evidence-api.service';

describe('EvidenceApiService', () => {
  let service: EvidenceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EvidenceApiService
      ]
    });
    service = TestBed.inject(EvidenceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
