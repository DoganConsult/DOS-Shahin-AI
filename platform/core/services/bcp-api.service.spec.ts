import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BcpApiService } from './bcp-api.service';

describe('BcpApiService', () => {
  let service: BcpApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BcpApiService
      ]
    });
    service = TestBed.inject(BcpApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
