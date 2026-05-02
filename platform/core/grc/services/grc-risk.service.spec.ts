import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GrcRiskService } from './grc-risk.service';

describe('GrcRiskService', () => {
  let service: GrcRiskService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrcRiskService
      ]
    });
    service = TestBed.inject(GrcRiskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
