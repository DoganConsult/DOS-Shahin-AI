import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MfaService } from './mfa.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MfaService
      ]
    });
    service = TestBed.inject(MfaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
