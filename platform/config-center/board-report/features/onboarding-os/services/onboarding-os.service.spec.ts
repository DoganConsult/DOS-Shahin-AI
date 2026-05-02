import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingOsService } from './onboarding-os.service';

describe('OnboardingOsService', () => {
  let service: OnboardingOsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingOsService
      ]
    });
    service = TestBed.inject(OnboardingOsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
