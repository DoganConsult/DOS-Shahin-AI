import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationApiService } from './navigation-api.service';

describe('NavigationApiService', () => {
  let service: NavigationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NavigationApiService
      ]
    });
    service = TestBed.inject(NavigationApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
