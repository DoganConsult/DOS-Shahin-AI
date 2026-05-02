import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardCatalogService } from './dashboard-catalog.service';

describe('DashboardCatalogService', () => {
  let service: DashboardCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardCatalogService
      ]
    });
    service = TestBed.inject(DashboardCatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
