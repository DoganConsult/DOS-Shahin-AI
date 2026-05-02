import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminConfigApiService } from './admin-config-api.service';

describe('AdminConfigApiService', () => {
  let service: AdminConfigApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminConfigApiService
      ]
    });
    service = TestBed.inject(AdminConfigApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
