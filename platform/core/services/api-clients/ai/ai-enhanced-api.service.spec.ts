import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEnhancedApiService } from './ai-enhanced-api.service';

describe('AiEnhancedApiService', () => {
  let service: AiEnhancedApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiEnhancedApiService
      ]
    });
    service = TestBed.inject(AiEnhancedApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
