import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiApiService } from './ai-api.service';

describe('AiApiService', () => {
  let service: AiApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiApiService
      ]
    });
    service = TestBed.inject(AiApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
