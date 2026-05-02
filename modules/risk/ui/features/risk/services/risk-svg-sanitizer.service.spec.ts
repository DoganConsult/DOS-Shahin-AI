import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskSvgSanitizerService } from './risk-svg-sanitizer.service';

describe('RiskSvgSanitizerService', () => {
  let service: RiskSvgSanitizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RiskSvgSanitizerService
      ]
    });
    service = TestBed.inject(RiskSvgSanitizerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
