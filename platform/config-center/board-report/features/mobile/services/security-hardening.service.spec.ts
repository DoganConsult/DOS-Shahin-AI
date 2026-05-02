import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SecurityHardeningService } from './security-hardening.service';

describe('SecurityHardeningService', () => {
  let service: SecurityHardeningService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SecurityHardeningService
      ]
    });
    service = TestBed.inject(SecurityHardeningService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
