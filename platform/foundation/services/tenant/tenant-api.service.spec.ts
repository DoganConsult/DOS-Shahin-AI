import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantApiService } from './tenant-api.service';

describe('TenantApiService', () => {
  let service: TenantApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TenantApiService
      ]
    });
    service = TestBed.inject(TenantApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
