import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformModeService } from './platform-mode.service';

describe('PlatformModeService', () => {
  let service: PlatformModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlatformModeService
      ]
    });
    service = TestBed.inject(PlatformModeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
