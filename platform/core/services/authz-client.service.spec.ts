import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthzClientService } from './authz-client.service';

describe('AuthzClientService', () => {
  let service: AuthzClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthzClientService
      ]
    });
    service = TestBed.inject(AuthzClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
