import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportFactoryCatalogService } from './report-factory-catalog.service';

describe('ReportFactoryCatalogService', () => {
  let service: ReportFactoryCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportFactoryCatalogService
      ]
    });
    service = TestBed.inject(ReportFactoryCatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
