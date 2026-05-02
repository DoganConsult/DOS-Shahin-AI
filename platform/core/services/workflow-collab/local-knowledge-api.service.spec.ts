import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalKnowledgeApiService } from './local-knowledge-api.service';

describe('LocalKnowledgeApiService', () => {
  let service: LocalKnowledgeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LocalKnowledgeApiService
      ]
    });
    service = TestBed.inject(LocalKnowledgeApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
