import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PrivacyApiService } from './privacy-api.service';

describe('PrivacyApiService', () => {
  let service: PrivacyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PrivacyApiService
      ]
    });
    service = TestBed.inject(PrivacyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
