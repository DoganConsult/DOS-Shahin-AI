import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BootstrapApiService } from './bootstrap-api.service';

describe('BootstrapApiService', () => {
  let service: BootstrapApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BootstrapApiService
      ]
    });
    service = TestBed.inject(BootstrapApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
