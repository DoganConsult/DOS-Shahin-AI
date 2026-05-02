import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlatformSettingsService } from './settings.service';

describe('PlatformSettingsService', () => {
  let service: PlatformSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PlatformSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all settings', () => {
    service.getAll().subscribe(settings => {
      expect(Array.isArray(settings)).toBe(true);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/settings'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get a specific setting', () => {
    service.get('theme').subscribe(setting => {
      expect(setting).toBeDefined();
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/settings/theme'));
    expect(req.request.method).toBe('GET');
    req.flush({ key: 'theme', value: 'dark' });
  });

  it('should set a setting', () => {
    service.set('theme', 'dark', 'global').subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/settings/theme'));
    expect(req.request.method).toBe('PUT');
    req.flush({ key: 'theme', value: 'dark' });
  });
});
