import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthAuditService } from './auth-audit.service';

describe('AuthAuditService', () => {
  let service: AuthAuditService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthAuditService
      ]
    });
    service = TestBed.inject(AuthAuditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
