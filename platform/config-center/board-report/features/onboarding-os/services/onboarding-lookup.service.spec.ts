import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingLookupService } from './onboarding-lookup.service';

describe('OnboardingLookupService', () => {
  let service: OnboardingLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingLookupService
      ]
    });
    service = TestBed.inject(OnboardingLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
