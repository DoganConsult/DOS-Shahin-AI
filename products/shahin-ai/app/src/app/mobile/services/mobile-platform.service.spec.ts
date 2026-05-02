import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MobilePlatformService } from './mobile-platform.service';

describe('MobilePlatformService', () => {
  let service: MobilePlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MobilePlatformService
      ]
    });
    service = TestBed.inject(MobilePlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
