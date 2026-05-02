import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PolicyExportService } from './policy-export.service';

describe('PolicyExportService', () => {
  let service: PolicyExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PolicyExportService
      ]
    });
    service = TestBed.inject(PolicyExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
