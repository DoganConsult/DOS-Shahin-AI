import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceApiService } from './ai-governance-api.service';

describe('AiGovernanceApiService', () => {
  let service: AiGovernanceApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiGovernanceApiService
      ]
    });
    service = TestBed.inject(AiGovernanceApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
