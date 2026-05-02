import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcComplianceService } from './grc-compliance.service';

describe('GrcComplianceService', () => {
  let service: GrcComplianceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcComplianceService
      ]
    });
    service = TestBed.inject(GrcComplianceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
