import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingAnswerService } from './onboarding-answer.service';

describe('OnboardingAnswerService', () => {
  let service: OnboardingAnswerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingAnswerService
      ]
    });
    service = TestBed.inject(OnboardingAnswerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
