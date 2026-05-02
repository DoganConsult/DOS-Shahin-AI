import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PostAuthOrchestratorService } from './post-auth-orchestrator.service';

describe('PostAuthOrchestratorService', () => {
  let service: PostAuthOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PostAuthOrchestratorService
      ]
    });
    service = TestBed.inject(PostAuthOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
