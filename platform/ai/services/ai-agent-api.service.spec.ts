import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAgentApiService } from './ai-agent-api.service';

describe('AiAgentApiService', () => {
  let service: AiAgentApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiAgentApiService
      ]
    });
    service = TestBed.inject(AiAgentApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
