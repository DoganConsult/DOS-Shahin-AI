import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { QualityGateApiService } from './quality-gate-api.service';

describe('QualityGateApiService', () => {
  let service: QualityGateApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QualityGateApiService
      ]
    });
    service = TestBed.inject(QualityGateApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
