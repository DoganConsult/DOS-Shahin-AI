import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformApiService } from './platform-api.service';

describe('PlatformApiService', () => {
  let service: PlatformApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlatformApiService
      ]
    });
    service = TestBed.inject(PlatformApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
