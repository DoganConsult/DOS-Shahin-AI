import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingValidationService } from './onboarding-validation.service';

describe('OnboardingValidationService', () => {
  let service: OnboardingValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingValidationService
      ]
    });
    service = TestBed.inject(OnboardingValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
