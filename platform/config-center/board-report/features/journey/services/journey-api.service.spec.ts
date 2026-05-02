import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { JourneyApiService } from './journey-api.service';

describe('JourneyApiService', () => {
  let service: JourneyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        JourneyApiService
      ]
    });
    service = TestBed.inject(JourneyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
