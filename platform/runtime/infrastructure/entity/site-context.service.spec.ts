import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SiteContextService } from './site-context.service';

describe('SiteContextService', () => {
  let service: SiteContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SiteContextService
      ]
    });
    service = TestBed.inject(SiteContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
