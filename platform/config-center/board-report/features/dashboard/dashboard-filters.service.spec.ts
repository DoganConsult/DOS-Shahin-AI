import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardFiltersService } from './dashboard-filters.service';

describe('DashboardFiltersService', () => {
  let service: DashboardFiltersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardFiltersService
      ]
    });
    service = TestBed.inject(DashboardFiltersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
