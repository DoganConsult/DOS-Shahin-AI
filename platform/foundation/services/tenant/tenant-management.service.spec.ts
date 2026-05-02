import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantManagementService } from './tenant-management.service';

describe('TenantManagementService', () => {
  let service: TenantManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TenantManagementService
      ]
    });
    service = TestBed.inject(TenantManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
