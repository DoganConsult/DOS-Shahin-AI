import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyApiService } from './policy-api.service';

describe('PolicyApiService', () => {
  let service: PolicyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PolicyApiService
      ]
    });
    service = TestBed.inject(PolicyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
