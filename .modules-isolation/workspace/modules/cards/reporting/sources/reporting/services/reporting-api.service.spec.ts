import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportingApiService } from './reporting-api.service';

describe('ReportingApiService', () => {
  let service: ReportingApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportingApiService
      ]
    });
    service = TestBed.inject(ReportingApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
