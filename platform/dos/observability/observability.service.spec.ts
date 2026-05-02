import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ObservabilityService } from './observability.service';

describe('ObservabilityService', () => {
  let service: ObservabilityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ObservabilityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get health checks', () => {
    service.getHealth().subscribe(checks => {
      expect(Array.isArray(checks)).toBe(true);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/health'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get metrics', () => {
    service.getMetrics(['cpu', 'memory']).subscribe(metrics => {
      expect(Array.isArray(metrics)).toBe(true);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/metrics'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
