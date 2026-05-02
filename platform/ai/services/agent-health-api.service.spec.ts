import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentHealthApiService } from './agent-health-api.service';

describe('AgentHealthApiService', () => {
  let service: AgentHealthApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgentHealthApiService
      ]
    });
    service = TestBed.inject(AgentHealthApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
