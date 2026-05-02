import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalyticsApiService } from './analytics-api.service';

describe('AnalyticsApiService', () => {
  let service: AnalyticsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AnalyticsApiService
      ]
    });
    service = TestBed.inject(AnalyticsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
