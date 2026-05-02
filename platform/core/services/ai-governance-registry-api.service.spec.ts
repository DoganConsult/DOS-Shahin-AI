import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceRegistryApiService } from './ai-governance-registry-api.service';

describe('AiGovernanceRegistryApiService', () => {
  let service: AiGovernanceRegistryApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiGovernanceRegistryApiService
      ]
    });
    service = TestBed.inject(AiGovernanceRegistryApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
