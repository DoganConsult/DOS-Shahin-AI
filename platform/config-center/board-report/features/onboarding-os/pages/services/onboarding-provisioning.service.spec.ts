import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingProvisioningService } from './onboarding-provisioning.service';

describe('OnboardingProvisioningService', () => {
  let service: OnboardingProvisioningService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingProvisioningService
      ]
    });
    service = TestBed.inject(OnboardingProvisioningService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
