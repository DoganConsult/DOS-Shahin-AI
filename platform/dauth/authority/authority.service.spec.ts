import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthorityService } from './authority.service';

describe('AuthorityService', () => {
  let service: AuthorityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthorityService
      ]
    });
    service = TestBed.inject(AuthorityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
