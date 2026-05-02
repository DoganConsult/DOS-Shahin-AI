import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalsApiService } from './portals-api.service';

describe('PortalsApiService', () => {
  let service: PortalsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PortalsApiService
      ]
    });
    service = TestBed.inject(PortalsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
