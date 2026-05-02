import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportStreamService } from './report-stream.service';

describe('ReportStreamService', () => {
  let service: ReportStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportStreamService
      ]
    });
    service = TestBed.inject(ReportStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
