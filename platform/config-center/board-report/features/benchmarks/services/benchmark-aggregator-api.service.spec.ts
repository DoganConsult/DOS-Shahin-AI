import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BenchmarkAggregatorApiService } from './benchmark-aggregator-api.service';

describe('BenchmarkAggregatorApiService', () => {
  let service: BenchmarkAggregatorApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BenchmarkAggregatorApiService
      ]
    });
    service = TestBed.inject(BenchmarkAggregatorApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
