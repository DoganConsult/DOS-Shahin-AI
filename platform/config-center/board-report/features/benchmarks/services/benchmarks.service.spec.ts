import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BenchmarksService } from './benchmarks.service';

describe('BenchmarksService', () => {
  let service: BenchmarksService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BenchmarksService
      ]
    });
    service = TestBed.inject(BenchmarksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
