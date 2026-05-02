import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KsaRegulatoryApiService } from './ksa-regulatory-api.service';

describe('KsaRegulatoryApiService', () => {
  let service: KsaRegulatoryApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        KsaRegulatoryApiService
      ]
    });
    service = TestBed.inject(KsaRegulatoryApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
