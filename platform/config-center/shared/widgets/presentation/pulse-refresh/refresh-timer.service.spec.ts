import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RefreshTimerService } from './refresh-timer.service';

describe('RefreshTimerService', () => {
  let service: RefreshTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RefreshTimerService
      ]
    });
    service = TestBed.inject(RefreshTimerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
