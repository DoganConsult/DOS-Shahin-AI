import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentAuditApiService } from './agent-audit-api.service';

describe('AgentAuditApiService', () => {
  let service: AgentAuditApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgentAuditApiService
      ]
    });
    service = TestBed.inject(AgentAuditApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
