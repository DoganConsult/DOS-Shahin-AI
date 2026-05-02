import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProvisioningApiService } from './provisioning-api.service';

describe('ProvisioningApiService', () => {
  let service: ProvisioningApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProvisioningApiService
      ]
    });
    service = TestBed.inject(ProvisioningApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
