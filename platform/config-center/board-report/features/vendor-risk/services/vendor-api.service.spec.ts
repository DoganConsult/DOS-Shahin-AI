import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorApiService } from './vendor-api.service';

describe('VendorApiService', () => {
  let service: VendorApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        VendorApiService
      ]
    });
    service = TestBed.inject(VendorApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
