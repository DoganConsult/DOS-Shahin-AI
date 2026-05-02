import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformBootstrapService } from './platform-bootstrap.service';

describe('PlatformBootstrapService', () => {
  let service: PlatformBootstrapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlatformBootstrapService
      ]
    });
    service = TestBed.inject(PlatformBootstrapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
