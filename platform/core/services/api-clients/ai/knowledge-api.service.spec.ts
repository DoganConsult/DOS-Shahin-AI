import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KnowledgeApiService } from './knowledge-api.service';

describe('KnowledgeApiService', () => {
  let service: KnowledgeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        KnowledgeApiService
      ]
    });
    service = TestBed.inject(KnowledgeApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
