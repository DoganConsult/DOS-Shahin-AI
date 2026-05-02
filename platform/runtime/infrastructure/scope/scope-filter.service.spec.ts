import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ScopeFilterService } from './scope-filter.service';

describe('ScopeFilterService', () => {
  let service: ScopeFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ScopeFilterService
      ]
    });
    service = TestBed.inject(ScopeFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
