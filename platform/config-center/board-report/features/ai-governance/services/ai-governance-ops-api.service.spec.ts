import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceOpsApiService } from './ai-governance-ops-api.service';

describe('AiGovernanceOpsApiService', () => {
  let service: AiGovernanceOpsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiGovernanceOpsApiService
      ]
    });
    service = TestBed.inject(AiGovernanceOpsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
