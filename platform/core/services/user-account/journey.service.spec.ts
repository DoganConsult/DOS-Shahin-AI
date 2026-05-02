import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { JourneyService } from './journey.service';

describe('JourneyService', () => {
  let service: JourneyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        JourneyService
      ]
    });
    service = TestBed.inject(JourneyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
