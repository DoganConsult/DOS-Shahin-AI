import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BiometricAuthService } from './biometric-auth.service';

describe('BiometricAuthService', () => {
  let service: BiometricAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BiometricAuthService
      ]
    });
    service = TestBed.inject(BiometricAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
