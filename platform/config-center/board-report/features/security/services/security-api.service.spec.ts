import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SecurityApiService } from './security-api.service';

describe('SecurityApiService', () => {
  let service: SecurityApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SecurityApiService
      ]
    });
    service = TestBed.inject(SecurityApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
