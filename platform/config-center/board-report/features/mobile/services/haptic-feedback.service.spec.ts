import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HapticFeedbackService } from './haptic-feedback.service';

describe('HapticFeedbackService', () => {
  let service: HapticFeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HapticFeedbackService
      ]
    });
    service = TestBed.inject(HapticFeedbackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
