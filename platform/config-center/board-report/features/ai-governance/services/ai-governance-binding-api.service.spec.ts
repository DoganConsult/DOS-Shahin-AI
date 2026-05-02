import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiGovernanceBindingApiService } from './ai-governance-binding-api.service';

describe('AiGovernanceBindingApiService', () => {
  let service: AiGovernanceBindingApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiGovernanceBindingApiService
      ]
    });
    service = TestBed.inject(AiGovernanceBindingApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
