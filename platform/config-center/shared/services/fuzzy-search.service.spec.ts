import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FuzzySearchService } from './fuzzy-search.service';

describe('FuzzySearchService', () => {
  let service: FuzzySearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FuzzySearchService
      ]
    });
    service = TestBed.inject(FuzzySearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
