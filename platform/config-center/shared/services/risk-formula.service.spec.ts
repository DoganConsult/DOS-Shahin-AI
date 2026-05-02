import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RiskFormulaService } from './risk-formula.service';

describe('RiskFormulaService', () => {
  let service: RiskFormulaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RiskFormulaService
      ]
    });
    service = TestBed.inject(RiskFormulaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
