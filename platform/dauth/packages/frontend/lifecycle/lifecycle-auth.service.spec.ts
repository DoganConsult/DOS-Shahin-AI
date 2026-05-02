import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LifecycleAuthService } from './lifecycle-auth.service';

describe('LifecycleAuthService', () => {
  let service: LifecycleAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LifecycleAuthService
      ]
    });
    service = TestBed.inject(LifecycleAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
