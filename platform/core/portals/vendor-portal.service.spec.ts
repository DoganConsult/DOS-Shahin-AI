import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VendorPortalService } from './vendor-portal.service';

describe('VendorPortalService', () => {
  let service: VendorPortalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        VendorPortalService
      ]
    });
    service = TestBed.inject(VendorPortalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
