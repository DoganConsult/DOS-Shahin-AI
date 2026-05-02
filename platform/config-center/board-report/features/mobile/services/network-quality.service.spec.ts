import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NetworkQualityService } from './network-quality.service';

describe('NetworkQualityService', () => {
  let service: NetworkQualityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NetworkQualityService
      ]
    });
    service = TestBed.inject(NetworkQualityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
