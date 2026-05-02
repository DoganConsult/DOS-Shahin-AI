import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyFiltersService } from './policy-filters.service';

describe('PolicyFiltersService', () => {
  let service: PolicyFiltersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PolicyFiltersService
      ]
    });
    service = TestBed.inject(PolicyFiltersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
