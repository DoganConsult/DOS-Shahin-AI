import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OnboardingDataLoaderService } from './onboarding-data-loader.service';

describe('OnboardingDataLoaderService', () => {
  let service: OnboardingDataLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingDataLoaderService
      ]
    });
    service = TestBed.inject(OnboardingDataLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
