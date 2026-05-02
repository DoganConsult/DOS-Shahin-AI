import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchApiService } from './search-api.service';

describe('SearchApiService', () => {
  let service: SearchApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SearchApiService
      ]
    });
    service = TestBed.inject(SearchApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
