import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformStatsService } from './platform-stats.service';

describe('PlatformStatsService', () => {
  let service: PlatformStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlatformStatsService
      ]
    });
    service = TestBed.inject(PlatformStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
