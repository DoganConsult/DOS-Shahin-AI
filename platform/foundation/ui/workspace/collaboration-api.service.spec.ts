import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CollaborationApiService } from './collaboration-api.service';

describe('CollaborationApiService', () => {
  let service: CollaborationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CollaborationApiService
      ]
    });
    service = TestBed.inject(CollaborationApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
