import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdvancedAnalyticsService } from './advanced-analytics.service';

describe('AdvancedAnalyticsService', () => {
  let service: AdvancedAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdvancedAnalyticsService
      ]
    });
    service = TestBed.inject(AdvancedAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
