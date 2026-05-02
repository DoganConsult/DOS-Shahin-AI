import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleOnboardingService } from './module-onboarding.service';

describe('ModuleOnboardingService', () => {
  let service: ModuleOnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ModuleOnboardingService
      ]
    });
    service = TestBed.inject(ModuleOnboardingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
