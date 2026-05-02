import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationApiService } from './foundation-api.service';

describe('FoundationApiService', () => {
  let service: FoundationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FoundationApiService
      ]
    });
    service = TestBed.inject(FoundationApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
