import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceCollabApiService } from './workspace-collab-api.service';

describe('WorkspaceCollabApiService', () => {
  let service: WorkspaceCollabApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkspaceCollabApiService
      ]
    });
    service = TestBed.inject(WorkspaceCollabApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
