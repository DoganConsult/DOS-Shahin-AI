import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceAuditApiService } from './workspace-audit-api.service';

describe('WorkspaceAuditApiService', () => {
  let service: WorkspaceAuditApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkspaceAuditApiService
      ]
    });
    service = TestBed.inject(WorkspaceAuditApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
